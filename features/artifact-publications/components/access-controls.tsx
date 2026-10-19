"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { displayDate } from "@/features/artifact-releases/lib/display";
import type {
  GuestParticipationRead,
  PublicationPublish,
  PublicationRead,
  PublicationRevoke,
} from "@/lib/api/generated/model";
import {
  addGrants,
  listEvents,
  listGrants,
  listParticipations,
  listRecipients,
  publishPublication,
  revokeGrant,
  revokeParticipation,
  withdrawPublication,
} from "../lib/access-api";

export const publicationStateLabel = (state: string) =>
  ({ prepared: "未公開", published: "公開中", withdrawn: "公開停止" })[state] ??
  state;
const participationLabel = (state: string) =>
  ({ active: "有効", revoked: "失効済み", expired: "期限切れ" })[state] ??
  state;
const eventLabel = (kind: string) =>
  ({
    published: "公開を確定",
    publication_published: "公開中へ変更",
    grants_added: "公開相手を追加",
    grant_created: "閲覧を許可",
    grant_revoked: "閲覧許可を失効",
    participation_created: "参加資格を登録",
    participation_revoked: "参加資格を失効",
    publication_withdrawn: "公開停止へ変更",
    withdrawn: "公開全体を停止",
  })[kind] ?? "公開許可の記録";
const reasonLabel = (reason: string | null | undefined) =>
  ({
    source_deleted: "元の情報が削除されたため",
    source_purged: "元の情報が完全削除されたため",
    user_unavailable: "本人の利用停止・削除のため",
    internal_membership_created: "同じ組織の社内メンバーになったため",
    project_deleted: "プロジェクトが削除されたため",
    tenant_unavailable: "組織の利用が停止されたため",
    publication_withdrawn: "公開全体が停止されたため",
    confirmed_publication: "固定内容と公開相手を確認",
  })[reason ?? ""] ??
  reason ??
  "—";

export function RevokeAccessDialog({
  label,
  description,
  version,
  onConfirm,
  onRefresh,
}: {
  label: string;
  description: string;
  version: number;
  onConfirm: (data: PublicationRevoke) => Promise<unknown>;
  onRefresh: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const attempt = useRef<PublicationRevoke | null>(null);
  const mutation = useMutation({
    mutationFn: () => {
      if (
        !attempt.current ||
        attempt.current.reason !== reason.trim() ||
        attempt.current.version !== version
      ) {
        attempt.current = {
          request_id: crypto.randomUUID(),
          version,
          reason: reason.trim(),
        };
      }
      return onConfirm(attempt.current);
    },
    onSuccess: async () => {
      await onRefresh();
      setOpen(false);
      setReason("");
      attempt.current = null;
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!mutation.isPending) {
          setOpen(next);
          if (!next) mutation.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor={reasonId}>理由</FieldLabel>
          <Textarea
            id={reasonId}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
          />
        </Field>
        <FormApiError error={mutation.error} />
        {mutation.error ? (
          <Button variant="outline" onClick={() => void onRefresh()}>
            入力を残して最新状態を確認
          </Button>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => setOpen(false)}
          >
            戻る
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "処理中…" : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SelectedRecipient = {
  participant: GuestParticipationRead;
  expires: string;
};
const defaultExpiry = (limit: string) => {
  const date = new Date(Math.min(Date.parse(limit), Date.now() + 86_400_000));
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};

export function PublicationAccessPanel({
  projectId,
  publication,
  fullContentReady,
}: {
  projectId: number;
  publication: PublicationRead;
  fullContentReady: boolean;
}) {
  const cache = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, SelectedRecipient>>(
    {},
  );
  const [ack, setAck] = useState(false);
  const [confirmation, setConfirmation] = useState<PublicationPublish | null>(
    null,
  );
  const identity = publication.content.id;
  const state = publication.state ?? "prepared";
  const [grantPage, setGrantPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const recipients = useQuery({
    queryKey: [
      "publication-access",
      projectId,
      identity,
      "recipients",
      search,
      page,
    ],
    queryFn: () =>
      listRecipients(projectId, { q: search, page, page_size: 20 }),
    enabled: state !== "withdrawn",
    retry: false,
  });
  const grants = useQuery({
    queryKey: ["publication-access", projectId, identity, "grants", grantPage],
    queryFn: () =>
      listGrants(projectId, identity, { page: grantPage, page_size: 20 }),
    retry: false,
  });
  const events = useQuery({
    queryKey: ["publication-access", projectId, identity, "events", eventPage],
    queryFn: () =>
      listEvents(projectId, identity, { page: eventPage, page_size: 20 }),
    retry: false,
  });
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({
        queryKey: ["publication-access", projectId, identity],
      }),
      cache.invalidateQueries({
        queryKey: ["publication", projectId, identity],
      }),
      cache.invalidateQueries({ queryKey: ["publications", projectId] }),
    ]);
  };
  const mutation = useMutation({
    mutationFn: () => {
      if (!confirmation) throw new Error("公開内容を確認してください");
      return confirmation.expected_state === "published"
        ? addGrants(projectId, identity, confirmation)
        : publishPublication(projectId, identity, confirmation);
    },
    onSuccess: async () => {
      await refresh();
      setConfirmation(null);
      setSelected({});
      setAck(false);
    },
  });
  const values = Object.values(selected);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  const valid =
    values.length > 0 &&
    values.length <= 20 &&
    values.every(
      ({ participant, expires }) =>
        Number.isFinite(Date.parse(expires)) &&
        Date.parse(expires) > now &&
        Date.parse(expires) <= Date.parse(participant.expires_at),
    );
  const prepare = () => {
    mutation.reset();
    setConfirmation({
      request_id: crypto.randomUUID(),
      expected_state: state === "published" ? "published" : "prepared",
      publication_version: publication.publication_version ?? 1,
      public_digest: publication.content.public_digest,
      confirmed_full_content: true,
      recipients: values.map(({ participant, expires }) => ({
        participation_id: participant.id,
        version: participant.version,
        expires_at: new Date(expires).toISOString(),
      })),
    });
  };
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>3. 公開先と期限を指定</CardTitle>
          <CardDescription>
            指定した本人だけが、この固定本文と添付一覧を閲覧できます。公開は合意・正式承認とは別です。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4">
          <Badge variant="secondary">{publicationStateLabel(state)}</Badge>
          {state === "withdrawn" ? (
            <Alert>
              <AlertTitle>この版の公開は停止しました</AlertTitle>
              <AlertDescription>
                同じ版を再公開しません。再度共有する場合は、新しい公開準備版を作ります。
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSearch(q);
                  setPage(1);
                }}
              >
                <Field className="min-w-48 flex-1">
                  <FieldLabel htmlFor="publication-recipient-search">
                    公開相手を検索
                  </FieldLabel>
                  <Input
                    id="publication-recipient-search"
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    placeholder="参加時の表示名"
                    maxLength={200}
                  />
                </Field>
                <Button type="submit" variant="outline">
                  検索
                </Button>
              </form>
              {recipients.isPending ? (
                <Skeleton className="h-24" />
              ) : recipients.error ? (
                <DataLoadError
                  resourceName="公開先候補"
                  onRetry={() => void recipients.refetch()}
                />
              ) : (
                <>
                  {!recipients.data.items.length ? (
                    <p className="text-sm text-muted-foreground">
                      有効な外部参加資格がありません。招待・参加登録の画面は後続工程です。
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>選択</TableHead>
                          <TableHead>相手・参加期限</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recipients.data.items.map((part) => (
                          <TableRow key={part.id}>
                            <TableCell>
                              <Checkbox
                                aria-label={`${part.display_label}を公開先に選択`}
                                checked={!!selected[part.id]}
                                disabled={
                                  !selected[part.id] && values.length >= 20
                                }
                                onCheckedChange={(checked) => {
                                  setAck(false);
                                  setSelected((previous) => {
                                    const next = { ...previous };
                                    if (checked === true)
                                      next[part.id] = {
                                        participant: part,
                                        expires: defaultExpiry(part.expires_at),
                                      };
                                    else delete next[part.id];
                                    return next;
                                  });
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              {part.display_label}
                              <p className="text-xs text-muted-foreground">
                                参加期限 {displayDate(part.expires_at)}
                              </p>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <DataPagination
                    page={page}
                    pageSize={20}
                    total={recipients.data.total}
                    currentCount={recipients.data.items.length}
                    onPageChange={setPage}
                  />
                </>
              )}
              <FieldGroup>
                {values.map(({ participant, expires }) => (
                  <Field key={participant.id}>
                    <FieldLabel htmlFor={`expiry-${participant.id}`}>
                      {participant.display_label}への公開期限
                    </FieldLabel>
                    <Input
                      id={`expiry-${participant.id}`}
                      type="datetime-local"
                      value={expires}
                      onChange={(event) => {
                        setAck(false);
                        setSelected((previous) => ({
                          ...previous,
                          [participant.id]: {
                            participant,
                            expires: event.target.value,
                          },
                        }));
                      }}
                    />
                    <FieldDescription>
                      参加期限以内の日時を指定します。
                    </FieldDescription>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAck(false);
                        setSelected((previous) => {
                          const next = { ...previous };
                          delete next[participant.id];
                          return next;
                        });
                      }}
                    >
                      選択を解除
                    </Button>
                  </Field>
                ))}
              </FieldGroup>
              <Field orientation="horizontal">
                <Checkbox
                  id="publication-full-ack"
                  checked={ack}
                  onCheckedChange={(value) => setAck(value === true)}
                  disabled={!fullContentReady}
                />
                <FieldLabel htmlFor="publication-full-ack">
                  本文全体・設計・テストデータ・全添付構成を確認し、この相手への公開に問題がないことを確認しました
                </FieldLabel>
              </Field>
              {!fullContentReady ? (
                <p role="status" className="text-sm text-muted-foreground">
                  本文とテスト内容の表示が揃うまで公開操作はできません。
                </p>
              ) : null}
              {values.length && !valid ? (
                <p role="alert" className="text-sm text-destructive">
                  公開期限を未来かつ参加期限以内に設定してください。
                </p>
              ) : null}
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          {state !== "withdrawn" ? (
            <>
              <Button
                disabled={!ack || !valid || !fullContentReady}
                onClick={prepare}
              >
                {state === "published"
                  ? "公開相手の追加を確認"
                  : "公開する内容と相手を確認"}
              </Button>
              <RevokeAccessDialog
                label="公開全体を停止"
                description="全員の閲覧許可を停止し、同じ版は再公開しません。社内の固定内容・履歴は残ります。"
                version={publication.publication_version ?? 1}
                onConfirm={(data) =>
                  withdrawPublication(projectId, identity, data)
                }
                onRefresh={refresh}
              />
            </>
          ) : null}
        </CardFooter>
      </Card>
      <Dialog
        open={!!confirmation}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setConfirmation(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>公開内容の最終確認</DialogTitle>
            <DialogDescription>
              固定内容と指定した本人・期限への許可を確定します。メール送信・正式承認・添付の新DLは行いません。
            </DialogDescription>
          </DialogHeader>
          <p className="font-semibold">{publication.content.title}</p>
          <p className="text-sm">
            {publication.content.node_count}部分の本文全体・添付
            {publication.content.files.length}件
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {publication.content.files.map((file) => (
              <li key={file.id}>{file.filename}</li>
            ))}
          </ul>
          <ul className="flex flex-col gap-2 text-sm">
            {confirmation?.recipients.map((recipient) => (
              <li key={recipient.participation_id}>
                {
                  selected[recipient.participation_id]?.participant
                    .display_label
                }
                ：{displayDate(recipient.expires_at)}まで
              </li>
            ))}
          </ul>
          <FormApiError error={mutation.error} />
          {mutation.error ? (
            <Button
              variant="outline"
              onClick={async () => {
                await refresh();
                setConfirmation(null);
                setAck(false);
              }}
            >
              入力を残して再確認へ戻る
            </Button>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => setConfirmation(null)}
            >
              戻る
            </Button>
            <Button
              disabled={mutation.isPending || !fullContentReady}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "処理中…" : "確認した内容を公開する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <section
        className="flex min-w-0 flex-col gap-3"
        aria-label="公開許可の一覧"
      >
        <h3 className="font-semibold">公開相手と許可の状態</h3>
        {grants.isPending ? (
          <Skeleton className="h-20" />
        ) : grants.error ? (
          <DataLoadError
            resourceName="公開許可"
            onRetry={() => void grants.refetch()}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>相手</TableHead>
                  <TableHead>状態・期限</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grants.data.items.map((grant) => (
                  <TableRow key={grant.id}>
                    <TableCell>{grant.display_label}</TableCell>
                    <TableCell>
                      {participationLabel(grant.effective_status)}
                      <p className="text-xs text-muted-foreground">
                        {displayDate(grant.expires_at)}まで
                      </p>
                    </TableCell>
                    <TableCell>
                      {grant.status === "active" ? (
                        <RevokeAccessDialog
                          label={`${grant.display_label}への許可を停止`}
                          description="この許可だけを停止します。他の相手への許可には影響しません。"
                          version={grant.version}
                          onConfirm={(data) =>
                            revokeGrant(projectId, identity, grant.id, data)
                          }
                          onRefresh={refresh}
                        />
                      ) : (
                        reasonLabel(grant.revocation_reason)
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!grants.data.total ? (
              <p className="text-sm text-muted-foreground">
                閲覧許可はまだありません。
              </p>
            ) : null}
            <DataPagination
              page={grantPage}
              pageSize={20}
              total={grants.data.total}
              currentCount={grants.data.items.length}
              onPageChange={setGrantPage}
            />
          </>
        )}
      </section>
      <section
        className="flex min-w-0 flex-col gap-3"
        aria-label="公開と失効の業務履歴"
      >
        <h3 className="font-semibold">公開・失効の履歴</h3>
        {events.isPending ? (
          <Skeleton className="h-20" />
        ) : events.error ? (
          <DataLoadError
            resourceName="公開履歴"
            onRetry={() => void events.refetch()}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>操作・判断者</TableHead>
                  <TableHead>理由</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.data.items.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{displayDate(event.occurred_at)}</TableCell>
                    <TableCell>
                      {eventLabel(event.event_kind)}
                      <p className="text-xs text-muted-foreground">
                        {event.actor_kind === "system_guard"
                          ? "システムによる停止・記録"
                          : `${event.actor_label ?? "記録された本人"}（ID ${event.actor_id}）`}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">
                      {reasonLabel(event.reason)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <DataPagination
              page={eventPage}
              pageSize={20}
              total={events.data.total}
              currentCount={events.data.items.length}
              onPageChange={setEventPage}
            />
          </>
        )}
      </section>
    </div>
  );
}

export function GuestParticipationsPanel({
  projectId,
  canManage,
}: {
  projectId: number;
  canManage: boolean;
}) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["guest-participations", projectId, page],
    queryFn: () => listParticipations(projectId, { page, page_size: 20 }),
    enabled: canManage,
    retry: false,
  });
  if (!canManage) return null;
  return (
    <section
      className="flex min-w-0 flex-col gap-3"
      aria-label="外部ゲストの参加資格"
    >
      <h2 className="text-base font-semibold">外部ゲストの参加資格</h2>
      <p className="text-sm text-muted-foreground">
        参加資格と資料ごとの閲覧許可は別です。ここでは参加資格全体を失効できます。招待・参加登録は後続工程です。
      </p>
      {query.isPending ? (
        <Skeleton className="h-20" />
      ) : query.error ? (
        <DataLoadError
          resourceName="外部参加資格"
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>本人・世代</TableHead>
                <TableHead>状態・期限</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((part) => (
                <TableRow key={part.id}>
                  <TableCell>
                    {part.display_label}・参加{part.generation}回目
                  </TableCell>
                  <TableCell>
                    {participationLabel(part.effective_status)}
                    <p className="text-xs text-muted-foreground">
                      {displayDate(part.expires_at)}まで
                    </p>
                  </TableCell>
                  <TableCell>
                    {part.status === "active" ? (
                      <RevokeAccessDialog
                        label={`${part.display_label}の参加を失効`}
                        description="この参加世代と、その世代へのすべての閲覧許可を失効します。再参加時に以前の許可は復活しません。"
                        version={part.version}
                        onConfirm={(data) =>
                          revokeParticipation(projectId, part.id, data)
                        }
                        onRefresh={() => query.refetch()}
                      />
                    ) : (
                      reasonLabel(part.revocation_reason)
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!query.data.total ? (
            <p className="text-sm text-muted-foreground">
              登録された外部参加資格はありません。
            </p>
          ) : null}
          <DataPagination
            page={page}
            pageSize={20}
            total={query.data.total}
            currentCount={query.data.items.length}
            onPageChange={setPage}
          />
        </>
      )}
    </section>
  );
}

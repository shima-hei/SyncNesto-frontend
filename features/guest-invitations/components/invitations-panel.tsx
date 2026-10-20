"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { RevokeAccessDialog } from "@/features/artifact-publications/components/access-controls";
import {
  invitationListProjectsProjectIdGuestInvitationsGet as list,
  invitationCreateProjectsProjectIdGuestInvitationsPost as create,
  invitationResendProjectsProjectIdGuestInvitationsInvitationIdResendPost as resend,
  invitationRevokeProjectsProjectIdGuestInvitationsInvitationIdRevokePost as revoke,
  invitationEventsProjectsProjectIdGuestInvitationsInvitationIdEventsGet as events,
} from "@/lib/api/generated/guest-invitations/guest-invitations";
import type {
  InvitationCreate,
  InvitationRead,
} from "@/lib/api/generated/model";
import {
  deliveryStateLabel,
  invitationCommand,
  invitationDate,
  invitationStateLabel,
} from "../lib/invitations";

export function GuestInvitationsPanel({
  projectId,
  canManage,
}: {
  projectId: number;
  canManage: boolean;
}) {
  const [page, setPage] = useState(1);
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const attempt = useRef<InvitationCreate | null>(null);
  const [defaultDate] = useState(() =>
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  );
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ["guest-invitations", projectId, page],
    queryFn: () => list(projectId, { page, page_size: 20 }),
    enabled: canManage,
    retry: false,
  });
  const refresh = async () => {
    await cache.invalidateQueries({
      queryKey: ["guest-invitations", projectId],
    });
    await cache.invalidateQueries({
      queryKey: ["guest-participations", projectId],
    });
  };
  const mutation = useMutation({
    mutationFn: () => create(projectId, attempt.current!),
    onSuccess: async () => {
      attempt.current = null;
      form.current?.reset();
      await refresh();
    },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutation.isPending) return;
    const values = new FormData(event.currentTarget);
    const fields = {
      email: String(values.get("email")).trim(),
      display_label: String(values.get("label")).trim(),
      participation_expires_at: new Date(
        `${values.get("expires")}T23:59:59`,
      ).toISOString(),
    };
    if (
      !attempt.current ||
      Object.entries(fields).some(
        ([key, value]) =>
          attempt.current?.[key as keyof InvitationCreate] !== value,
      )
    )
      attempt.current = { request_id: crypto.randomUUID(), ...fields };
    mutation.mutate();
  };
  if (!canManage) return null;
  return (
    <section
      className="flex min-w-0 flex-col gap-4"
      aria-label="外部ゲストを招待"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">外部ゲストを招待</h2>
        <p className="text-sm text-muted-foreground">
          メールの確認・本人の受諾後に参加資格ができます。資料の閲覧・承認権限は自動では付きません。
        </p>
      </div>
      <form ref={form} onSubmit={submit} className="max-w-2xl">
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`${id}-email`}>
                招待先メールアドレス
              </FieldLabel>
              <Input
                id={`${id}-email`}
                name="email"
                type="email"
                autoComplete="off"
                required
                maxLength={255}
                disabled={mutation.isPending}
              />
              <FieldDescription>
                LOCALで許可されたダミー宛先のみ送信できます。
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-label`}>招待先の呼び名</FieldLabel>
              <Input
                id={`${id}-label`}
                name="label"
                required
                maxLength={255}
                disabled={mutation.isPending}
              />
              <FieldDescription>
                本人の氏名は初回設定で入力します。
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-expires`}>参加期限</FieldLabel>
              <Input
                id={`${id}-expires`}
                name="expires"
                type="date"
                defaultValue={defaultDate}
                required
                disabled={mutation.isPending}
              />
              <FieldDescription>
                招待への返答期限は最長7日間です。
              </FieldDescription>
            </Field>
          </div>
          <FormApiError error={mutation.error} />
          {mutation.isSuccess ? (
            <p role="status" className="text-sm">
              招待を作成しました。下の送信状態をご確認ください。
            </p>
          ) : null}
          <div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? "招待を処理しています…"
                : "招待メールを送る"}
            </Button>
          </div>
        </FieldGroup>
      </form>
      {query.isPending ? (
        <p role="status">招待を読み込んでいます…</p>
      ) : query.error ? (
        <DataLoadError
          resourceName="招待"
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>招待先</TableHead>
                <TableHead>招待・送信状態</TableHead>
                <TableHead>返答・参加期限</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>まだ招待はありません。</TableCell>
                </TableRow>
              ) : (
                query.data.items.map((row) => (
                  <InvitationRow
                    key={row.id}
                    row={row}
                    projectId={projectId}
                    onRefresh={refresh}
                  />
                ))
              )}
            </TableBody>
          </Table>
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

function InvitationRow({
  row,
  projectId,
  onRefresh,
}: {
  row: InvitationRead;
  projectId: number;
  onRefresh: () => Promise<unknown>;
}) {
  const [showEvents, setShowEvents] = useState(false);
  const [eventPage, setEventPage] = useState(1);
  const attempt = useRef<ReturnType<typeof invitationCommand> | null>(null);
  const query = useQuery({
    queryKey: [
      "guest-invitation-events",
      projectId,
      row.id,
      row.version,
      eventPage,
    ],
    queryFn: () =>
      events(projectId, row.id, { page: eventPage, page_size: 20 }),
    enabled: showEvents,
    retry: false,
  });
  const sending = useMutation({
    mutationFn: () => {
      if (attempt.current?.version !== row.version)
        attempt.current = invitationCommand(row);
      return resend(projectId, row.id, attempt.current!);
    },
    onSuccess: async () => {
      attempt.current = null;
      await onRefresh();
    },
  });
  const eventLabel = (kind: string) =>
    ({
      created: "招待を作成",
      resent: "新リンクで再送",
      delivery_sent: "送信を受付",
      delivery_unknown: "送信結果不明",
      delivery_failed: "送信失敗",
      registered: "本人が初回設定",
      accepted: "本人が参加",
      declined: "参加を辞退",
      revoked: "招待を取消",
      expired: "招待期限切れ",
    })[kind] ?? "招待の記録";
  return (
    <>
      <TableRow>
        <TableCell>
          <p>{row.display_label}</p>
          <p className="text-xs text-muted-foreground break-all">{row.email}</p>
        </TableCell>
        <TableCell>
          <Badge variant="secondary">{invitationStateLabel(row.state)}</Badge>
          <p className="mt-1 text-xs text-muted-foreground">
            {deliveryStateLabel(row.delivery_state)}
          </p>
        </TableCell>
        <TableCell>
          <p>{invitationDate(row.expires_at)}</p>
          <p className="text-xs text-muted-foreground">
            参加：{invitationDate(row.participation_expires_at)}
          </p>
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-2">
            {row.state === "pending" ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sending.isPending}
                  onClick={() => sending.mutate()}
                >
                  再送する
                </Button>
                <RevokeAccessDialog
                  label="招待を取り消す"
                  description="この招待と確認中のリンクを無効にします。既に受諾済みの参加資格はここでは停止できません。"
                  version={row.version}
                  onConfirm={(data) => revoke(projectId, row.id, data)}
                  onRefresh={onRefresh}
                />
              </>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={showEvents}
              onClick={() => setShowEvents(!showEvents)}
            >
              {showEvents ? "履歴を閉じる" : "履歴"}
            </Button>
          </div>
          <FormApiError error={sending.error} />
        </TableCell>
      </TableRow>
      {showEvents ? (
        <TableRow>
          <TableCell colSpan={4}>
            <div className="flex flex-col gap-3">
              <h3 className="font-medium">{row.display_label}への招待履歴</h3>
              {query.isPending ? (
                <p>履歴を読み込んでいます…</p>
              ) : query.error ? (
                <DataLoadError
                  resourceName="招待履歴"
                  onRetry={() => void query.refetch()}
                />
              ) : (
                <>
                  <ol className="flex flex-col gap-2">
                    {query.data.items.map((event) => (
                      <li key={event.id}>
                        {eventLabel(event.kind)} ·{" "}
                        {event.actor_name ??
                          (event.actor_kind === "email_recipient"
                            ? "招待メールの確認者"
                            : "配送処理")}{" "}
                        · {invitationDate(event.occurred_at)}
                        {event.reason ? (
                          <p className="text-muted-foreground">
                            {event.reason}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                  <DataPagination
                    page={eventPage}
                    pageSize={20}
                    total={query.data.total}
                    currentCount={query.data.items.length}
                    onPageChange={setEventPage}
                  />
                </>
              )}
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

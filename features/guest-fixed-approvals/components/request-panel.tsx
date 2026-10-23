"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { ChoiceField } from "@/features/fixed-approvals/components/choice-field";
import {
  approvalPath,
  basisLabels,
} from "@/features/fixed-approvals/lib/display";
import type {
  GuestApprovalBasis,
  GuestApprovalInput,
  GuestApprovalPreview,
  PublicationNodeRead,
} from "@/lib/api/generated/model";
import {
  createRequest,
  listCandidates,
  previewRequest,
  readBasis,
} from "../lib/api";
import { approvalKindLabels } from "../lib/display";

export function GuestApprovalRequestPanel({
  projectId,
  publicationId,
  nodes,
  enabled,
  ready,
}: {
  projectId: number;
  publicationId: string;
  nodes: PublicationNodeRead[];
  enabled: boolean;
  ready: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [search, setSearch] = useState("");
  const [targetPage, setTargetPage] = useState(1);
  const [grant, setGrant] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidatePage, setCandidatePage] = useState(1);
  const [basisPage, setBasisPage] = useState(1);
  const [note, setNote] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<{
    input: GuestApprovalInput;
    preview: GuestApprovalPreview;
    requestId: string;
  } | null>(null);
  const [checked, setChecked] = useState(false);
  const [validation, setValidation] = useState("");
  const targets = nodes.filter(
    (node) =>
      approvalKindLabels[node.node_kind] &&
      String(node.payload.title ?? "")
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const visible = targets.slice((targetPage - 1) * 20, targetPage * 20);
  const selected = nodes.find((node) => node.id === target);
  const choices =
    selected && !visible.some((node) => node.id === selected.id)
      ? [selected, ...visible]
      : visible;
  const candidates = useQuery({
    queryKey: [
      "guest-approval-candidates",
      projectId,
      publicationId,
      target,
      candidateSearch,
      candidatePage,
    ],
    queryFn: ({ signal }) =>
      listCandidates(
        projectId,
        {
          publication_id: publicationId,
          target_node_id: target,
          q: candidateSearch,
          page: candidatePage,
          page_size: 20,
        },
        { signal },
      ),
    enabled: open && !!target && enabled,
    retry: false,
    gcTime: 0,
  });
  const bases = useQuery({
    queryKey: ["guest-approval-bases", projectId, publicationId, target],
    queryFn: async ({ signal }) => {
      const rows: GuestApprovalBasis[] = [];
      let cursor: string | undefined;
      let scope: string | undefined;
      do {
        const page = await readBasis(
          projectId,
          {
            publication_id: publicationId,
            target_node_id: target,
            cursor,
            page_size: 100,
          },
          { signal },
        );
        if (scope && page.scope_digest !== scope)
          throw new Error("合意根拠が変わりました。再確認してください");
        scope = page.scope_digest;
        rows.push(...page.items);
        cursor = page.next_cursor ?? undefined;
        if (!cursor && rows.length !== page.total)
          throw new Error("要件を全件取得できませんでした");
      } while (cursor);
      return rows;
    },
    enabled: open && !!target && enabled,
    retry: false,
    gcTime: 0,
  });
  const preview = useMutation({
    mutationFn: (input: GuestApprovalInput) => previewRequest(projectId, input),
    onSuccess: (result, input) => {
      setConfirmed({ input, preview: result, requestId: crypto.randomUUID() });
      setChecked(false);
    },
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!confirmed || !checked)
        throw new Error("公開する内容を確認してください");
      return createRequest(projectId, {
        ...confirmed.input,
        request_id: confirmed.requestId,
        expected_preview_digest: confirmed.preview.preview_digest,
        confirm_public_scope: checked,
      });
    },
    onSuccess: (result) => router.push(approvalPath(projectId, result.id)),
  });
  const busy = preview.isPending || save.isPending;
  const missing = bases.data?.filter((row) => row.state !== "agreed") ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>この公開内容への判断を依頼</CardTitle>
        <CardDescription>
          要件の合意、文書・設計・テスト設計の独立した承認を、現在の共有先1名へ依頼します。資料共有とは別操作です。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button asChild variant="outline">
          <Link
            href={`/projects/joined/${projectId}/fixed-approvals?audience=guest&publication_id=${publicationId}`}
          >
            この公開版の依頼・判断履歴へ
          </Link>
        </Button>
        {!enabled ? (
          <p className="text-sm text-muted-foreground">
            公開中の本文全体を確認すると依頼を作成できます。新規依頼を停止している場合も、履歴と取消は合意・承認一覧から確認できます。
          </p>
        ) : (
          <Dialog
            open={open}
            onOpenChange={(value) => {
              if (!busy) setOpen(value);
            }}
          >
            <DialogTrigger asChild>
              <Button disabled={!ready}>判断を依頼する</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {confirmed
                    ? "相手に表示する依頼を確認"
                    : "判断する固定内容と相手を選択"}
                </DialogTitle>
                <DialogDescription>
                  公開済みの本文全体と選択添付の構成を維持します。相手へのメール・通知配信はこの段階では行いません。
                </DialogDescription>
              </DialogHeader>
              {confirmed ? (
                <>
                  <Alert>
                    <AlertTitle>{confirmed.preview.title}</AlertTitle>
                    <AlertDescription>
                      <p>{approvalKindLabels[confirmed.preview.target_kind]}</p>
                      <p>
                        依頼先：{confirmed.preview.approver_name} ／ 依頼元：
                        {confirmed.preview.requester_name}
                      </p>
                      <p className="whitespace-pre-wrap">
                        {confirmed.preview.request_note || "依頼文なし"}
                      </p>
                      <p>
                        例外 {confirmed.preview.exception_count}
                        件。設計/テスト設計の独立承認は、その選択対象と添付への承認です。他の本文は参考資料です。
                      </p>
                    </AlertDescription>
                  </Alert>
                  {confirmed.input.exceptions?.map((item) => (
                    <p
                      key={item.node_id}
                      className="whitespace-pre-wrap text-sm"
                    >
                      {
                        bases.data?.find((row) => row.node_id === item.node_id)
                          ?.title
                      }
                      ：{item.reason}
                    </p>
                  ))}
                  <Field orientation="horizontal">
                    <Checkbox
                      id="guest-request-public-confirm"
                      checked={checked}
                      onCheckedChange={(value) => setChecked(value === true)}
                      disabled={busy}
                    />
                    <FieldLabel htmlFor="guest-request-public-confirm">
                      この依頼文・全例外理由を相手へ表示し、指定した固定内容への判断を依頼します
                    </FieldLabel>
                  </Field>
                  <FormApiError error={save.error} />
                  <DialogFooter>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setConfirmed(null)}
                    >
                      入力に戻る
                    </Button>
                    <Button
                      disabled={busy || !checked}
                      onClick={() => save.mutate()}
                    >
                      {save.isPending
                        ? "依頼しています…"
                        : "この内容で依頼を作成"}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setValidation("");
                    if (!bases.data || !grant || !target) {
                      setValidation(
                        "判断する内容と有効な共有先を選択してください",
                      );
                      return;
                    }
                    if (missing.some((row) => !reasons[row.node_id]?.trim())) {
                      setValidation(
                        "外部合意が不足する全要件へ例外理由を入力してください",
                      );
                      return;
                    }
                    preview.mutate({
                      publication_id: publicationId,
                      target_node_id: target,
                      grant_id: grant,
                      request_note: note.trim() || null,
                      exceptions: missing.map((row) => ({
                        node_id: row.node_id,
                        reason: reasons[row.node_id].trim(),
                      })),
                    });
                  }}
                >
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="guest-target-search">
                        判断対象を探す
                      </FieldLabel>
                      <Input
                        id="guest-target-search"
                        value={search}
                        onChange={(event) => {
                          setSearch(event.target.value);
                          setTargetPage(1);
                        }}
                        disabled={busy}
                      />
                    </Field>
                    <ChoiceField
                      label="判断する内容"
                      value={target}
                      onChange={(value) => {
                        setTarget(value);
                        setGrant("");
                        setReasons({});
                        setBasisPage(1);
                        setCandidatePage(1);
                      }}
                      choices={choices.map((node) => ({
                        value: node.id,
                        label: `${String(node.payload.title ?? "固定した内容")} · ${approvalKindLabels[node.node_kind]}`,
                      }))}
                      disabled={busy}
                    />
                    <DataPagination
                      page={targetPage}
                      pageSize={20}
                      total={targets.length}
                      currentCount={visible.length}
                      onPageChange={setTargetPage}
                      isFetching={false}
                    />
                    {target ? (
                      <>
                        <Field>
                          <FieldLabel htmlFor="guest-candidate-search">
                            共有先の氏名で絞る
                          </FieldLabel>
                          <Input
                            id="guest-candidate-search"
                            value={candidateSearch}
                            onChange={(event) => {
                              setCandidateSearch(event.target.value);
                              setCandidatePage(1);
                            }}
                            disabled={busy}
                          />
                        </Field>
                        <ChoiceField
                          label="判断を依頼する相手"
                          value={grant}
                          onChange={setGrant}
                          choices={
                            candidates.data?.items.map((row) => ({
                              value: row.grant_id,
                              label: row.name,
                            })) ?? []
                          }
                          disabled={busy || candidates.isPending}
                        />
                        <FormApiError error={candidates.error} />
                        {candidates.data ? (
                          <DataPagination
                            page={candidatePage}
                            pageSize={20}
                            total={candidates.data.total}
                            currentCount={candidates.data.items.length}
                            onPageChange={setCandidatePage}
                            isFetching={candidates.isFetching}
                          />
                        ) : null}
                        {candidates.data?.total === 0 ? (
                          <p className="text-sm">
                            有効な共有先がいません。先に下の共有先管理で、相手と期限を明示して許可してください。
                          </p>
                        ) : null}
                      </>
                    ) : null}
                    <Field>
                      <FieldLabel htmlFor="guest-request-note">
                        依頼の目的・確認してほしいこと
                      </FieldLabel>
                      <Textarea
                        id="guest-request-note"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        maxLength={2000}
                        disabled={busy}
                      />
                      <FieldDescription>
                        相手に表示されます。既存の非公開ゴールや社内メモは自動挿入しません。
                      </FieldDescription>
                    </Field>
                    <FormApiError error={bases.error} />
                    {missing.length ? (
                      <>
                        <p className="text-sm font-medium">
                          外部合意不足の例外 {missing.length}件
                        </p>
                        {missing
                          .slice((basisPage - 1) * 20, basisPage * 20)
                          .map((row) => (
                            <Field key={row.node_id}>
                              <FieldLabel
                                htmlFor={`guest-exception-${row.node_id}`}
                              >
                                {row.title} ·{" "}
                                {basisLabels[row.state] ?? "外部合意不足"}
                              </FieldLabel>
                              <Textarea
                                id={`guest-exception-${row.node_id}`}
                                value={reasons[row.node_id] ?? ""}
                                onChange={(event) =>
                                  setReasons((previous) => ({
                                    ...previous,
                                    [row.node_id]: event.target.value,
                                  }))
                                }
                                maxLength={2000}
                                disabled={busy}
                              />
                              <FieldDescription>
                                この理由も相手に公開されます。文書承認で個別要件を合意済みには変更しません。
                              </FieldDescription>
                            </Field>
                          ))}
                        <DataPagination
                          page={basisPage}
                          pageSize={20}
                          total={missing.length}
                          currentCount={
                            missing.slice((basisPage - 1) * 20, basisPage * 20)
                              .length
                          }
                          onPageChange={setBasisPage}
                          isFetching={bases.isFetching}
                        />
                      </>
                    ) : null}
                    {validation ? (
                      <p role="alert" className="text-sm text-destructive">
                        {validation}
                      </p>
                    ) : null}
                    <FormApiError error={preview.error} />
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={busy || !target || !grant || !bases.data}
                      >
                        {preview.isPending
                          ? "確認しています…"
                          : "相手に見せる依頼を確認"}
                      </Button>
                    </DialogFooter>
                  </FieldGroup>
                </form>
              )}
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  FileCheckIcon,
  LockIcon,
} from "lucide-react";
import { toast } from "sonner";
import { UserDisplay } from "@/components/shared/display/user-avatar";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DecisionShareFields,
  readDecisionShare,
} from "@/features/artifact-publications/components/decision-share-fields";
import { IncludedSourcesPicker } from "@/features/artifact-releases/components/included-sources-picker";
import { PublishedReviewAttachments } from "@/features/guest-requirement-reviews/components/published-review-attachments";
import {
  createGuestApproval,
  previewGuestApproval,
  readReviewOptions,
} from "@/features/guest-requirement-reviews/lib/api";
import { ApiError } from "@/lib/api/error";
import type {
  ArtifactSource,
  PublicationNodeRead,
  PublicationRead,
  PublicationShareInput,
  RequirementFormalApprovalInput,
  RequirementFormalApprovalPreview,
} from "@/lib/api/generated/model";
import {
  createRequirementFormalApprovalProjectsProjectIdRequirementDocumentsDocumentIdFormalApprovalRequestsPost as requestApproval,
  listFormalApprovalRecipientsProjectsProjectIdRequirementWorkflowFormalApprovalRecipientsGet as listApprovers,
  listReviewRecipientsProjectsProjectIdRequirementWorkflowRecipientsGet as listOwners,
  previewRequirementFormalApprovalProjectsProjectIdRequirementDocumentsDocumentIdFormalApprovalRequestsPreviewPost as previewApproval,
} from "@/lib/api/generated/requirement-workflow/requirement-workflow";
import { getReadRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdGetQueryKey as documentKey } from "@/lib/api/generated/requirements/requirements";
import styles from "./requirement-formal-approval-dialog.module.css";

type Confirmation = {
  input: ApprovalInput;
  preview: RequirementFormalApprovalPreview;
  key: string;
};
type ApprovalInput = RequirementFormalApprovalInput & {
  grantIds?: string[];
  sharing?: PublicationShareInput;
};

export function RequirementFormalApprovalDialog({
  projectId,
  documentId,
  documentVersion,
  disabled,
  canRecordException,
  onRequested,
  publication,
  externalHref,
}: {
  projectId: number;
  documentId: number;
  documentVersion: number;
  disabled: boolean;
  canRecordException: boolean;
  onRequested?: () => void;
  externalHref?: string;
  publication?: {
    record: PublicationRead;
    nodes: PublicationNodeRead[];
  };
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [grantIds, setGrantIds] = useState<string[]>([]);
  const [shareWithGuest, setShareWithGuest] = useState(false);
  const publicationId = publication?.record.content.id;
  const newPublication = publication?.record.state === "prepared";
  const combineSharing = Boolean(
    publication && (newPublication || shareWithGuest),
  );
  const [dueOn, setDueOn] = useState("");
  const [note, setNote] = useState("");
  const [attachments, setAttachments] = useState<ArtifactSource[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [exceptionPanel, setExceptionPanel] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const people = useQuery({
    queryKey: ["requirement-formal-approval-approvers", projectId],
    queryFn: ({ signal }) => listApprovers(projectId, { signal }),
    enabled: open,
    retry: false,
  });
  const owners = useQuery({
    queryKey: ["requirement-review-recipients", projectId],
    queryFn: ({ signal }) => listOwners(projectId, { signal }),
    enabled: open && exceptionPanel,
    retry: false,
  });
  const guests = useQuery({
    queryKey: ["guest-requirement-review-options", projectId, publicationId],
    queryFn: ({ signal }) =>
      readReviewOptions(
        projectId,
        { publication_id: publicationId! },
        { signal },
      ),
    enabled: Boolean(open && publication),
    retry: false,
  });
  const externalInput = ({
    grantIds = [],
    sharing,
    participant_ids,
    due_on,
    note,
    exceptions,
  }: ApprovalInput) => ({
    publication_id: publication!.record.content.id,
    expected_public_digest: publication!.record.content.public_digest,
    grant_ids: grantIds,
    sharing,
    participant_ids,
    due_on,
    note,
    exceptions,
  });
  const preview = useMutation({
    mutationFn: (input: ApprovalInput) =>
      publication
        ? previewGuestApproval(projectId, externalInput(input))
        : previewApproval(projectId, documentId, input),
  });
  const request = useMutation({
    mutationFn: ({ input, preview: result, key }: Confirmation) => {
      const confirmed = {
        request_key: key,
        expected_digest: result.confirmation_digest,
        confirmed_content: true as const,
      };
      return publication
        ? createGuestApproval(projectId, {
            ...externalInput(input),
            ...confirmed,
          })
        : requestApproval(projectId, documentId, { ...input, ...confirmed });
    },
  });
  const busy = preview.isPending || request.isPending;
  const hasRecipients = publication
    ? grantIds.length > 0 || combineSharing
    : selectedIds.length > 0;
  const selectionFull =
    grantIds.length + selectedIds.length + Number(combineSharing) >= 25;

  async function prepare(input: ApprovalInput) {
    const result = await preview.mutateAsync(input);
    setConfirmation({ input, preview: result, key: crypto.randomUUID() });
    setExceptionPanel(false);
    requestAnimationFrame(() => summaryRef.current?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || disabled) return;
    setError(null);
    const values = new FormData(event.currentTarget);
    try {
      if (!confirmation) {
        if (!hasRecipients) return;
        const sharing =
          publication && combineSharing
            ? readDecisionShare(values, publication.record)
            : undefined;
        if (combineSharing && (!sharing || !dueOn)) {
          setError(
            new Error(
              "参加期限内の共有期限と承認の回答期限を指定してください。",
            ),
          );
          return;
        }
        await prepare({
          document_version: documentVersion,
          participant_ids: selectedIds,
          due_on: dueOn || undefined,
          note: note.trim() || undefined,
          included_sources: attachments,
          ...(publication ? { grantIds, sharing: sharing ?? undefined } : {}),
        });
      } else if (exceptionPanel) {
        await prepare({
          ...confirmation.input,
          exceptions: confirmation.preview.blockers.map((blocker) => ({
            kind: blocker.kind,
            id: blocker.id,
            reason: String(values.get(`reason-${blocker.id}`) ?? "").trim(),
            owner_id: Number(values.get(`owner-${blocker.id}`)),
            due_on: String(values.get(`due-${blocker.id}`) ?? ""),
          })),
        });
      } else if (
        confirmation.preview.can_request &&
        values.get("confirmed") === "on"
      ) {
        await request.mutateAsync(confirmation);
        dialogRef.current?.close();
        await client.invalidateQueries({
          queryKey: ["requirement-workflow", projectId],
        });
        if (publicationId) {
          void client.invalidateQueries({
            queryKey: ["publication", projectId, publicationId],
          });
          void client.invalidateQueries({
            queryKey: ["publication-access", projectId, publicationId],
          });
          void client.invalidateQueries({
            queryKey: ["publications", projectId],
          });
        }
        toast.success("正式承認を依頼しました");
        onRequested?.();
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setConfirmation(null);
        setExceptionPanel(false);
        void client.invalidateQueries({
          queryKey: documentKey(projectId, documentId),
        });
      }
      setError(
        caught instanceof Error
          ? caught
          : new Error("正式承認を依頼できませんでした。"),
      );
    }
  }

  const result = confirmation?.preview;
  const reviewReady =
    !result?.review_required || Boolean(result.reviewed_request_id);
  const reviewedCount = result?.reviewed_request_ids?.length ?? 0;
  const reviewCheckLabel = !result?.review_required
    ? "案件の方針で事前レビューは任意"
    : !reviewReady
      ? "必要なレビューが未完了"
      : reviewedCount > 1
        ? `承認対象のレビューが完了（${reviewedCount}件）`
        : "承認対象のレビューが完了";
  const exceptionCount = confirmation?.input.exceptions?.length ?? 0;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => {
          setOpen(true);
          dialogRef.current?.showModal();
        }}
      >
        <FileCheckIcon data-icon="inline-start" />
        {publication ? "顧客を含む正式承認を依頼" : "正式承認を依頼"}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={styles.dialog}
        onClose={() => {
          setOpen(false);
          setConfirmation(null);
          setExceptionPanel(false);
          setAttachments([]);
          setSelectedIds([]);
          setGrantIds([]);
          setShareWithGuest(false);
          setDueOn("");
          setNote("");
          setError(null);
        }}
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        {open ? (
          <form className="grid min-w-0 gap-5 p-5" onSubmit={submit}>
            <header className="grid gap-2 border-b pb-4">
              <h1 id={titleId} className="text-xl font-semibold">
                正式承認を依頼
              </h1>
              <p id={descriptionId} className="text-sm text-muted-foreground">
                要件定義書全体を、開発の基準として承認するよう依頼します。
              </p>
              {externalHref && !result && !disabled && !busy ? (
                <Link
                  href={externalHref}
                  className="w-fit text-sm underline underline-offset-4"
                >
                  外部の関係者へ正式承認を依頼
                </Link>
              ) : null}
            </header>
            {publication && (
              <fieldset
                disabled={busy || Boolean(result)}
                className={
                  result ? "hidden" : "grid gap-3 rounded-md border p-3 text-sm"
                }
              >
                <legend className="px-1 font-medium">
                  承認依頼に付随する共有
                </legend>
                {!newPublication && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={shareWithGuest}
                      disabled={!shareWithGuest && selectionFull}
                      onChange={(event) =>
                        setShareWithGuest(event.target.checked)
                      }
                    />
                    参加中のゲストにこの固定版も共有する
                  </label>
                )}
                {combineSharing && (
                  <DecisionShareFields
                    projectId={projectId}
                    publication={publication.record}
                    existingParticipants={guests.data?.reviewers.map(
                      (person) => person.participation_id,
                    )}
                  />
                )}
              </fieldset>
            )}
            {result ? (
              <>
                <section className="grid min-w-0 gap-2">
                  <h2
                    ref={summaryRef}
                    tabIndex={-1}
                    className="text-sm text-muted-foreground"
                  >
                    承認対象
                  </h2>
                  <p className="font-semibold [overflow-wrap:anywhere]">
                    {result.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    全{result.section_count}章・{result.requirement_count}要件
                    ・ 文書の更新版 {result.document_version}
                  </p>
                  {confirmation.input.sharing && (
                    <p className="text-sm">
                      この依頼と同時に閲覧を許可します。共有期限{" "}
                      {new Date(
                        confirmation.input.sharing.recipients[0].expires_at,
                      ).toLocaleString("ja-JP")}
                    </p>
                  )}
                </section>
                <section className="grid gap-2 border-y py-4">
                  <h2 className="font-semibold">承認前の確認</h2>
                  <ul className="grid gap-3 text-sm">
                    <ApprovalCheck ready={!disabled}>
                      {publication
                        ? "公開版と保存済みの編集内容が一致"
                        : "未保存の変更なし"}
                    </ApprovalCheck>
                    <ApprovalCheck ready={reviewReady}>
                      {reviewCheckLabel}
                    </ApprovalCheck>
                    <ApprovalCheck
                      ready={
                        !result.blockers.some(
                          (item) => item.kind === "correction",
                        ) || exceptionCount > 0
                      }
                    >
                      対応必須の修正依頼{" "}
                      {
                        result.blockers.filter(
                          (item) => item.kind === "correction",
                        ).length
                      }
                      件
                    </ApprovalCheck>
                    <ApprovalCheck
                      ready={
                        !result.blockers.some(
                          (item) => item.kind === "open_issue",
                        ) || exceptionCount > 0
                      }
                    >
                      対応必須の未決事項{" "}
                      {
                        result.blockers.filter(
                          (item) => item.kind === "open_issue",
                        ).length
                      }
                      件
                    </ApprovalCheck>
                    {result.pending_approval_id ? (
                      <ApprovalCheck ready={false}>
                        進行中の正式承認があります
                      </ApprovalCheck>
                    ) : null}
                  </ul>
                </section>
                <section className="grid gap-2 text-sm">
                  <h2 className="font-semibold">正式承認者</h2>
                  <p className="text-muted-foreground">
                    指定した承認者全員の承認で確定します。
                  </p>
                  <ul className="grid gap-1">
                    {result.recipients.map((person) => (
                      <li key={person.id}>
                        <UserDisplay name={person.name} emptyLabel="承認者" />
                      </li>
                    ))}
                  </ul>
                </section>
                {result.blockers.length ? (
                  <details
                    className="grid gap-2 rounded-md border p-3 text-sm"
                    onToggle={(event) =>
                      setExceptionPanel(
                        event.currentTarget.open &&
                          canRecordException &&
                          !exceptionCount,
                      )
                    }
                  >
                    <summary className="cursor-pointer font-medium">
                      {exceptionCount
                        ? `承認の例外 ${exceptionCount}件`
                        : "対応が必要な項目・詳細設定"}
                    </summary>
                    <div className="grid gap-3 pt-3">
                      {owners.error && exceptionPanel ? (
                        <DataLoadError
                          resourceName="例外の担当者候補"
                          onRetry={() => void owners.refetch()}
                        />
                      ) : null}
                      {result.blockers.map((blocker) => {
                        const exception = confirmation.input.exceptions?.find(
                          (item) =>
                            item.kind === blocker.kind &&
                            item.id === blocker.id,
                        );
                        return (
                          <div
                            key={`${blocker.kind}-${blocker.id}`}
                            className="grid min-w-0 gap-2 border-t pt-2"
                          >
                            <p className="font-medium [overflow-wrap:anywhere]">
                              {blocker.title}
                            </p>
                            {exceptionPanel ? (
                              <>
                                <label className="grid gap-1">
                                  例外の理由
                                  <Textarea
                                    name={`reason-${blocker.id}`}
                                    required
                                    maxLength={2000}
                                  />
                                </label>
                                <label className="grid gap-1">
                                  担当者
                                  <select
                                    required
                                    name={`owner-${blocker.id}`}
                                    className="h-9 rounded-md border bg-background px-2"
                                  >
                                    <option value="">選択してください</option>
                                    {owners.data?.map((person) => (
                                      <option key={person.id} value={person.id}>
                                        {person.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="grid gap-1">
                                  対応期限
                                  <Input
                                    type="date"
                                    name={`due-${blocker.id}`}
                                    required
                                  />
                                </label>
                              </>
                            ) : exception ? (
                              <p className="text-muted-foreground [overflow-wrap:anywhere]">
                                {exception.reason} ・ 対応期限{" "}
                                {exception.due_on}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ) : null}
                {result.can_request && !exceptionPanel ? (
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="confirmed"
                      className="mt-1"
                      required
                    />
                    承認対象の内容を確認しました
                  </label>
                ) : null}
              </>
            ) : (
              <>
                {people.error ? (
                  <DataLoadError
                    resourceName="正式承認者"
                    onRetry={() => void people.refetch()}
                  />
                ) : people.isPending ? (
                  <p role="status" className="text-sm text-muted-foreground">
                    正式承認者を読み込んでいます…
                  </p>
                ) : (
                  <fieldset disabled={busy} className="grid gap-2 text-sm">
                    <legend className="pb-2 font-semibold">
                      {publication ? "社内の承認者（任意）" : "正式承認者"}
                    </legend>
                    {people.data.length ? (
                      people.data.map((person) => (
                        <label
                          key={person.id}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(person.id)}
                            disabled={
                              !selectedIds.includes(person.id) && selectionFull
                            }
                            onChange={(event) => {
                              const checked = event.currentTarget.checked;
                              setSelectedIds((ids) =>
                                checked
                                  ? [...ids, person.id]
                                  : ids.filter((id) => id !== person.id),
                              );
                            }}
                          />
                          <UserDisplay name={person.name} emptyLabel="承認者" />
                        </label>
                      ))
                    ) : (
                      <p className="text-muted-foreground">
                        この案件で指定できる承認者がいません。
                      </p>
                    )}
                  </fieldset>
                )}
                {publication && !newPublication ? (
                  <fieldset disabled={busy} className="grid gap-2 text-sm">
                    <legend className="pb-2 font-semibold">外部の承認者</legend>
                    {guests.error ? (
                      <DataLoadError
                        resourceName="現在の共有先"
                        onRetry={() => void guests.refetch()}
                      />
                    ) : guests.isPending ? (
                      <p role="status" className="text-muted-foreground">
                        共有先を確認しています…
                      </p>
                    ) : guests.data.reviewers.length ? (
                      guests.data.reviewers.map((person) => (
                        <label
                          key={person.grant_id}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={grantIds.includes(person.grant_id)}
                            disabled={
                              selectionFull &&
                              !grantIds.includes(person.grant_id)
                            }
                            onChange={(event) => {
                              const checked = event.currentTarget.checked;
                              setGrantIds((ids) =>
                                checked
                                  ? [...ids, person.grant_id]
                                  : ids.filter((id) => id !== person.grant_id),
                              );
                            }}
                          />
                          <UserDisplay name={person.name} emptyLabel="承認者" />
                        </label>
                      ))
                    ) : (
                      <p className="text-muted-foreground">
                        現在有効な共有先がありません。
                      </p>
                    )}
                  </fieldset>
                ) : null}
                <label className="grid gap-2 text-sm">
                  {combineSharing ? "回答期限" : "回答期限（任意）"}
                  <Input
                    type="date"
                    required={combineSharing}
                    value={dueOn}
                    onChange={(event) => setDueOn(event.currentTarget.value)}
                    disabled={busy}
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  依頼メッセージ（任意）
                  <Textarea
                    value={note}
                    onChange={(event) => setNote(event.currentTarget.value)}
                    maxLength={2000}
                    readOnly={busy}
                  />
                </label>
                {publication ? (
                  <PublishedReviewAttachments nodes={publication.nodes} />
                ) : (
                  <details className="rounded-md border p-3 text-sm">
                    <summary className="cursor-pointer">添付資料</summary>
                    <div className="mt-3">
                      <IncludedSourcesPicker
                        projectId={projectId}
                        value={attachments}
                        onChange={setAttachments}
                        disabled={busy}
                        limit={20}
                      />
                    </div>
                  </details>
                )}
              </>
            )}
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LockIcon className="size-4 shrink-0" aria-hidden="true" />
              {publication
                ? "確認した公開版が承認の対象になります。"
                : "申請時点の内容を承認対象版として保存します。"}
            </p>
            <FormApiError error={error} />
            <footer className="flex flex-wrap justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => dialogRef.current?.close()}
              >
                キャンセル
              </Button>
              {result ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setConfirmation(null);
                    setExceptionPanel(false);
                  }}
                >
                  入力に戻る
                </Button>
              ) : null}
              <Button
                type="submit"
                disabled={
                  busy ||
                  disabled ||
                  (result
                    ? exceptionPanel
                      ? !owners.data?.length
                      : !result.can_request
                    : !hasRecipients)
                }
              >
                {busy
                  ? "確認中…"
                  : !result
                    ? "依頼内容を確認"
                    : exceptionPanel
                      ? "例外を反映して再確認"
                      : "承認を依頼する"}
              </Button>
            </footer>
          </form>
        ) : null}
      </dialog>
    </>
  );
}

function ApprovalCheck({
  ready,
  children,
}: {
  ready: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2">
      {ready ? (
        <CheckCircle2Icon
          className="mt-0.5 size-4 shrink-0 text-[var(--status-success-fg)]"
          aria-hidden="true"
        />
      ) : (
        <CircleAlertIcon
          className="mt-0.5 size-4 shrink-0 text-[var(--status-warning-fg)]"
          aria-hidden="true"
        />
      )}
      <span className="sr-only">{ready ? "確認済み" : "要確認"}</span>
      {children}
    </li>
  );
}

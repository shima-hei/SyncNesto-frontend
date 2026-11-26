"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LockIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";

import { UserDisplay } from "@/components/shared/display/user-avatar";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IncludedSourcesPicker } from "@/features/artifact-releases/components/included-sources-picker";
import { ApiError } from "@/lib/api/error";
import type {
  ArtifactSource,
  RequirementReviewInput,
  RequirementReviewPreview,
  RequirementSectionRead,
} from "@/lib/api/generated/model";
import {
  getReadRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdGetQueryKey as documentKey,
  listRequirementsProjectsProjectIdRequirementsGet as listRequirements,
} from "@/lib/api/generated/requirements/requirements";
import {
  createRequirementReviewProjectsProjectIdRequirementDocumentsDocumentIdReviewRequestsPost as createReview,
  listReviewRecipientsProjectsProjectIdRequirementWorkflowRecipientsGet as listRecipients,
  previewRequirementReviewProjectsProjectIdRequirementDocumentsDocumentIdReviewRequestsPreviewPost as previewReview,
} from "@/lib/api/generated/requirement-workflow/requirement-workflow";

type ReviewScope = NonNullable<RequirementReviewInput["scope_kind"]>;
const selectClass =
  "h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring";

export function RequirementReviewRequestDialog({
  projectId,
  documentId,
  documentVersion,
  sections = [],
  targetRequirement,
  disabled,
  externalHref,
  onRequested,
}: {
  projectId: number;
  documentId: number;
  documentVersion: number;
  sections?: RequirementSectionRead[];
  targetRequirement?: { id: number; title: string };
  disabled: boolean;
  externalHref?: string;
  onRequested: (requestId: string) => void;
}) {
  const scopeId = useId();
  const targetId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmationRef = useRef<HTMLHeadingElement>(null);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<ReviewScope>("requirement_document");
  const [selection, setSelection] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [participants, setParticipants] = useState<number[]>([]);
  const [dueOn, setDueOn] = useState("");
  const [note, setNote] = useState("");
  const [attachments, setAttachments] = useState<ArtifactSource[]>([]);
  const [confirmed, setConfirmed] = useState<{
    input: RequirementReviewInput;
    preview: RequirementReviewPreview;
    key: string;
  } | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const recipients = useQuery({
    queryKey: ["requirement-review-recipients", projectId],
    queryFn: () => listRecipients(projectId),
    enabled: open,
    retry: false,
  });
  const requirements = useQuery({
    queryKey: [
      "requirement-review-targets",
      projectId,
      documentId,
      search,
      page,
    ],
    queryFn: () =>
      listRequirements(projectId, {
        document_id: documentId,
        q: search || undefined,
        page,
        page_size: 20,
      }),
    enabled: open && scope === "requirement" && !targetRequirement,
    retry: false,
  });
  const preview = useMutation({
    mutationFn: (input: RequirementReviewInput) =>
      previewReview(projectId, documentId, input),
  });
  const request = useMutation({
    mutationFn: (input: NonNullable<typeof confirmed>) =>
      createReview(projectId, documentId, {
        ...input.input,
        request_key: input.key,
        expected_digest: input.preview.confirmation_digest,
      }),
  });
  const busy = preview.isPending || request.isPending;
  const canPrepare =
    participants.length > 0 &&
    (scope === "requirement_document" || Boolean(selection));
  const close = () => dialogRef.current?.close();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || disabled) return;
    setError(null);
    try {
      if (confirmed) {
        const created = await request.mutateAsync(confirmed);
        setConfirmed(null);
        setParticipants([]);
        setNote("");
        setDueOn("");
        setAttachments([]);
        close();
        toast.success("レビューを依頼しました。");
        void queryClient.invalidateQueries({
          queryKey: ["requirement-workflow", projectId],
        });
        onRequested(created.id);
        return;
      }
      if (!canPrepare) return;
      const input: RequirementReviewInput = {
        document_version: documentVersion,
        scope_kind: targetRequirement ? "requirement" : scope,
        scope_id:
          targetRequirement?.id ??
          (scope === "requirement_document" ? null : Number(selection)),
        participant_ids: participants,
        due_on: dueOn || null,
        note: note.trim() || null,
        included_sources: attachments,
      };
      const result = await preview.mutateAsync(input);
      setConfirmed({ input, preview: result, key: crypto.randomUUID() });
      requestAnimationFrame(() => confirmationRef.current?.focus());
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "VERSION_CONFLICT") {
        setConfirmed(null);
        void queryClient.invalidateQueries({
          queryKey: documentKey(projectId, documentId),
        });
      }
      setError(
        caught instanceof Error
          ? caught
          : new Error("レビューを依頼できませんでした。"),
      );
    }
  }

  return (
    <>
      <Button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen(true);
          dialogRef.current?.showModal();
        }}
      >
        <SendIcon data-icon="inline-start" />
        レビューを依頼
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
        onClose={() => setOpen(false)}
        className="m-auto max-h-[min(90dvh,55rem)] w-[min(94vw,38rem)] max-w-none overflow-y-auto overscroll-contain rounded-xl border bg-background text-foreground shadow-xl backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-black/55"
      >
        <form
          onSubmit={(event) => void submit(event)}
          className="flex flex-col gap-5 p-5 sm:p-6"
        >
          <header className="flex flex-col gap-1 border-b pb-4">
            <h2 id={titleId} className="text-lg font-semibold">
              レビューを依頼
            </h2>
            <p id={descriptionId} className="text-sm text-muted-foreground">
              確認してほしい内容と担当者を選択してください。
            </p>
            {externalHref && !confirmed && !disabled && !busy ? (
              <Link
                href={externalHref}
                className="w-fit text-sm underline underline-offset-4"
              >
                外部の関係者へレビューを依頼
              </Link>
            ) : null}
          </header>
          {confirmed ? (
            <div className="flex flex-col gap-4">
              <h3 ref={confirmationRef} tabIndex={-1} className="font-semibold">
                依頼内容の確認
              </h3>
              <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted-foreground">対象</dt>
                <dd>
                  {confirmed.preview.target_title}（
                  {confirmed.preview.requirement_count}要件）
                </dd>
                <dt className="text-muted-foreground">担当者</dt>
                <dd>
                  {confirmed.preview.recipients
                    .map((person) => person.name)
                    .join("、")}
                </dd>
                {confirmed.preview.due_on ? (
                  <>
                    <dt className="text-muted-foreground">回答期限</dt>
                    <dd>{confirmed.preview.due_on}</dd>
                  </>
                ) : null}
                {confirmed.input.included_sources?.length ? (
                  <>
                    <dt className="text-muted-foreground">添付</dt>
                    <dd>{confirmed.input.included_sources.length}件</dd>
                  </>
                ) : null}
                {confirmed.input.note ? (
                  <>
                    <dt className="text-muted-foreground">メッセージ</dt>
                    <dd className="whitespace-pre-wrap break-words">
                      {confirmed.input.note}
                    </dd>
                  </>
                ) : null}
              </dl>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <LockIcon className="size-4 shrink-0" aria-hidden="true" />
                依頼時点の内容を確認用の版として保存します。
              </p>
            </div>
          ) : (
            <>
              {targetRequirement ? (
                <dl className="grid gap-2 text-sm">
                  <dt className="font-medium">レビュー対象</dt>
                  <dd className="[overflow-wrap:anywhere]">
                    {targetRequirement.title}
                  </dd>
                </dl>
              ) : (
                <div className="flex flex-col gap-2 text-sm">
                  <label htmlFor={scopeId} className="font-medium">
                    レビュー対象
                  </label>
                  <select
                    id={scopeId}
                    value={scope}
                    className={selectClass}
                    disabled={busy}
                    onChange={(event) => {
                      setScope(event.target.value as ReviewScope);
                      setSelection("");
                    }}
                  >
                    <option value="requirement_document">要件定義書全体</option>
                    <option value="section">章・セクション</option>
                    <option value="requirement">個別要件</option>
                  </select>
                  {scope === "requirement" ? (
                    <Input
                      aria-label="要件名・番号で検索"
                      placeholder="要件名・番号で検索"
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setSelection("");
                        setPage(1);
                      }}
                      disabled={busy}
                    />
                  ) : null}
                  {scope !== "requirement_document" ? (
                    <>
                      <label htmlFor={targetId} className="sr-only">
                        {scope === "section" ? "章" : "要件"}
                      </label>
                      <select
                        id={targetId}
                        required
                        value={selection}
                        className={selectClass}
                        disabled={
                          busy ||
                          (scope === "requirement" && requirements.isFetching)
                        }
                        onChange={(event) => setSelection(event.target.value)}
                      >
                        <option value="">選択してください</option>
                        {scope === "section"
                          ? sections.map((section) => (
                              <option key={section.id} value={section.id}>
                                {section.title}
                              </option>
                            ))
                          : requirements.data?.items.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.requirement_code} {item.title}
                              </option>
                            ))}
                      </select>
                    </>
                  ) : null}
                  {scope === "requirement" && requirements.error ? (
                    <DataLoadError
                      resourceName="要件候補"
                      onRetry={() => void requirements.refetch()}
                    />
                  ) : null}
                  {scope === "requirement" &&
                  ((requirements.data?.total ?? 0) > 20 || page > 1) ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy || page <= 1}
                        onClick={() => {
                          setSelection("");
                          setPage(page - 1);
                        }}
                      >
                        前の要件
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={
                          busy || page * 20 >= (requirements.data?.total ?? 0)
                        }
                        onClick={() => {
                          setSelection("");
                          setPage(page + 1);
                        }}
                      >
                        次の要件
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
              <fieldset disabled={busy} className="flex flex-col gap-2 text-sm">
                <legend className="mb-2 font-medium">レビュー担当者</legend>
                {recipients.error ? (
                  <DataLoadError
                    resourceName="担当者候補"
                    onRetry={() => void recipients.refetch()}
                  />
                ) : recipients.isPending ? (
                  <p role="status" className="text-muted-foreground">
                    担当者を読み込んでいます…
                  </p>
                ) : recipients.data?.length ? (
                  <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
                    {recipients.data.map((person) => {
                      const checked = participants.includes(person.id);
                      return (
                        <label
                          key={person.id}
                          className="flex items-center gap-2 py-1"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={!checked && participants.length >= 25}
                            onCheckedChange={(next) =>
                              setParticipants((current) =>
                                next === true
                                  ? [...current, person.id]
                                  : current.filter((id) => id !== person.id),
                              )
                            }
                          />
                          <UserDisplay name={person.name} emptyLabel="担当者" />
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    指定できる担当者がいません。
                  </p>
                )}
              </fieldset>
              <label className="flex flex-col gap-2 text-sm font-medium">
                回答期限（任意）
                <Input
                  type="date"
                  value={dueOn}
                  onChange={(event) => setDueOn(event.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                依頼メッセージ（任意）
                <Textarea
                  value={note}
                  maxLength={2000}
                  onChange={(event) => setNote(event.target.value)}
                  disabled={busy}
                />
              </label>
              <details className="rounded-md border px-3 py-2 text-sm">
                <summary className="cursor-pointer font-medium">
                  添付資料
                </summary>
                <div className="pt-3">
                  <IncludedSourcesPicker
                    projectId={projectId}
                    value={attachments}
                    onChange={setAttachments}
                    disabled={busy}
                    limit={20}
                  />
                </div>
              </details>
            </>
          )}
          {error ? <FormApiError error={error} /> : null}
          <footer className="flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={
                confirmed
                  ? () => {
                      setConfirmed(null);
                      setError(null);
                    }
                  : close
              }
            >
              {confirmed ? "入力に戻る" : "キャンセル"}
            </Button>
            <Button
              type="submit"
              disabled={disabled || busy || (!confirmed && !canPrepare)}
            >
              {confirmed ? "依頼する" : "依頼内容を確認"}
            </Button>
          </footer>
        </form>
      </dialog>
    </>
  );
}

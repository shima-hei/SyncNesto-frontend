"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  FileCheckIcon,
  GitCompareArrowsIcon,
  LockIcon,
  Undo2Icon,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PublicationBody } from "@/features/artifact-publications/components/publication-content";
import { useFreshShared } from "@/features/artifact-publications/hooks/use-fresh-shared";
import { loadSharedContent } from "@/features/artifact-publications/lib/load-shared-content";
import { ApprovalMfa } from "@/features/guest-fixed-approvals/components/approval-mfa";
import { reviewRequestStatus } from "@/features/requirements/lib/requirement-workflow-review";
import { ApiError } from "@/lib/api/error";
import type { SharedRequirementFormalApprovalDecision } from "@/lib/api/generated/model";
import { formatDate } from "@/lib/format/date";
import { decideApproval, readApproval } from "../lib/api";
import { SharedApprovalComparison } from "./approval-comparison";

export function SharedRequirementApprovalWorkspace({
  publicationId,
  requestId,
}: {
  publicationId: string;
  requestId: string;
}) {
  const contentRoot = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [view, setView] = useState<"summary" | "document" | "comparison">(
    "summary",
  );
  const [decision, setDecision] = useState<"approved" | "returned">("approved");
  const [reason, setReason] = useState("");
  const [contentReady, setContentReady] = useState(false);
  const [reviewedContent, setReviewedContent] = useState<string | null>(null);
  const operation = useRef<{ payload: string; id: string } | null>(null);
  const mask = useCallback((hidden: boolean) => {
    if (contentRoot.current) contentRoot.current.hidden = hidden;
    if (hidden && dialog.current?.open) dialog.current.close();
  }, []);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const request = await readApproval(publicationId, requestId, { signal });
      if (view === "summary") return { request };
      const [current, previous] = await Promise.all([
        loadSharedContent(publicationId, signal),
        view === "comparison" && request.previous_publication_id
          ? loadSharedContent(request.previous_publication_id, signal)
          : undefined,
      ]);
      const latest = await readApproval(publicationId, requestId, { signal });
      if (
        latest.authorization_revision !==
          current.metadata.authorization_revision ||
        latest.public_digest !== current.metadata.content.public_digest ||
        (previous &&
          latest.previous_publication_id !== previous.metadata.content.id)
      ) {
        throw new Error("閲覧許可が更新されました。再確認してください。");
      }
      return { request: latest, current, previous };
    },
    [publicationId, requestId, view],
  );
  const { value, error, refresh, operationSignal } = useFreshShared(
    `${publicationId}:${requestId}:${view}`,
    load,
    mask,
  );
  const request = value?.request;
  useEffect(() => {
    if (!request) return;
    const expiry = Math.min(
      Date.parse(request.expires_at),
      value.previous
        ? Date.parse(value.previous.metadata.expires_at)
        : Infinity,
    );
    const timer = window.setTimeout(
      () => void refresh(),
      Math.max(0, Math.min(expiry - Date.now(), 2_147_483_647)),
    );
    return () => window.clearTimeout(timer);
  }, [request, value, refresh]);
  const save = useMutation({
    mutationFn: (input: SharedRequirementFormalApprovalDecision) =>
      decideApproval(publicationId, requestId, input, {
        signal: operationSignal,
      }),
    onSuccess: (_, input) => {
      operation.current = null;
      setReason("");
      toast.success(
        input.decision === "approved" ? "承認を記録しました" : "差し戻しました",
      );
      void refresh();
    },
    onError: (caught) => {
      if (
        caught instanceof ApiError &&
        [401, 403, 404, 409].includes(caught.status)
      )
        void refresh();
    },
  });
  const contentKey = request
    ? `${request.public_digest}:${request.authorization_revision}`
    : null;
  const canDecide = Boolean(
    request?.can_decide && reviewedContent === contentKey,
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canDecide || !request || save.isPending || operationSignal?.aborted)
      return;
    const payload = {
      version: request.version,
      expected_public_digest: request.public_digest,
      confirmed_content: true as const,
      decision,
      reason: decision === "returned" ? reason.trim() : undefined,
    };
    const serialized = JSON.stringify(payload);
    if (operation.current?.payload !== serialized) {
      operation.current = { payload: serialized, id: crypto.randomUUID() };
    }
    save.mutate({ ...payload, operation_key: operation.current.id });
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="ghost">
          <Link href="/shared/publications" prefetch={false}>
            <ArrowLeftIcon data-icon="inline-start" />
            共有一覧へ戻る
          </Link>
        </Button>
        <Button variant="outline" onClick={() => void refresh()}>
          閲覧許可を再確認
        </Button>
      </div>
      <div ref={contentRoot} className="min-w-0">
        {error instanceof ApiError && error.code === "MFA_REQUIRED" ? (
          <ApprovalMfa
            returnTo={`/shared/publications/${publicationId}/requirement-approvals/${requestId}`}
          />
        ) : error ? (
          <DataLoadError
            resourceName="正式承認の対象版"
            onRetry={() => {
              setView("summary");
              void refresh();
            }}
          />
        ) : !request ? (
          <Skeleton className="h-40" />
        ) : (
          <section className="grid min-w-0 gap-5 rounded-lg border p-4 sm:p-6">
            <header className="grid gap-3 border-b pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-lg font-semibold">要件定義書の正式承認</h1>
                <Badge variant="outline">
                  {request.status === "requested"
                    ? request.responded
                      ? "回答済み"
                      : "承認待ち"
                    : reviewRequestStatus[request.status]}
                </Badge>
              </div>
              <h2 className="text-xl font-semibold [overflow-wrap:anywhere]">
                {request.title}
              </h2>
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <LockIcon className="size-4" aria-hidden />
                承認対象版 {request.version_label}
                {request.due_on
                  ? ` ・ 回答期限 ${formatDate(request.due_on)}`
                  : ""}
              </p>
              {request.note ? (
                <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {request.note}
                </p>
              ) : null}
            </header>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                aria-pressed={view === "document"}
                onClick={() =>
                  setView(view === "document" ? "summary" : "document")
                }
              >
                <FileCheckIcon data-icon="inline-start" />
                要件定義書全文を確認
              </Button>
              {request.previous_publication_id ? (
                <Button
                  variant="outline"
                  aria-pressed={view === "comparison"}
                  onClick={() =>
                    setView(view === "comparison" ? "summary" : "comparison")
                  }
                >
                  <GitCompareArrowsIcon data-icon="inline-start" />
                  前回承認済み版との比較
                </Button>
              ) : null}
            </div>
            {view === "comparison" ? (
              value.current && value.previous ? (
                <SharedApprovalComparison
                  requestId={requestId}
                  current={value.current}
                  previous={value.previous}
                  onRecheck={refresh}
                />
              ) : (
                <p className="text-sm text-muted-foreground" role="status">
                  閲覧できる前回承認済み版がありません。
                </p>
              )
            ) : null}
            {view === "document" && value.current ? (
              <div className="grid min-w-0 gap-5 border-y py-4">
                <section
                  className="grid min-w-0 gap-4"
                  aria-label="承認対象版の本文"
                >
                  <h3 className="font-semibold">承認対象版の本文</h3>
                  <PublicationBody
                    key={contentKey}
                    nodes={value.current.nodes}
                    publicationId={publicationId}
                    onReady={setContentReady}
                    reader
                  />
                  {request.can_decide ? (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={contentReady && reviewedContent === contentKey}
                        disabled={!contentReady}
                        onChange={(event) =>
                          setReviewedContent(
                            event.currentTarget.checked ? contentKey : null,
                          )
                        }
                      />
                      承認対象の全文を確認しました
                    </label>
                  ) : null}
                </section>
              </div>
            ) : null}
            {request.can_decide ? (
              <div className="grid gap-3 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  {canDecide
                    ? "指定された承認者全員が承認すると、この版が開発基準になります。"
                    : "承認対象の全文を確認すると、判断を記録できます。"}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    disabled={!canDecide || save.isPending}
                    onClick={() => {
                      setDecision("returned");
                      dialog.current?.showModal();
                    }}
                  >
                    <Undo2Icon data-icon="inline-start" />
                    差し戻す
                  </Button>
                  <Button
                    disabled={!canDecide || save.isPending}
                    onClick={() => {
                      setDecision("approved");
                      dialog.current?.showModal();
                    }}
                  >
                    <FileCheckIcon data-icon="inline-start" />
                    承認する
                  </Button>
                </div>
              </div>
            ) : null}
            <FormApiError error={save.error} />
            <dialog
              ref={dialog}
              aria-labelledby={titleId}
              className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-auto overscroll-contain rounded-lg border bg-background text-foreground backdrop:bg-black/50"
            >
              <form className="grid gap-4 p-5" onSubmit={submit}>
                <h2 id={titleId} className="font-semibold">
                  {decision === "approved"
                    ? "この版を正式承認する"
                    : "この版を差し戻す"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {request.title} ・ {request.version_label}
                </p>
                {decision === "returned" ? (
                  <label className="grid gap-1 text-sm">
                    差し戻す理由
                    <Textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      maxLength={2000}
                      required
                      readOnly={save.isPending}
                    />
                  </label>
                ) : null}
                <FormApiError error={save.error} />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => dialog.current?.close()}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      save.isPending ||
                      (decision === "returned" && !reason.trim())
                    }
                  >
                    {decision === "approved"
                      ? "正式承認する"
                      : "差し戻しを記録する"}
                  </Button>
                </div>
              </form>
            </dialog>
          </section>
        )}
      </div>
    </div>
  );
}

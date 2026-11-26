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
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LockIcon,
} from "lucide-react";
import { toast } from "sonner";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  PublicationBody,
  PublicNode,
} from "@/features/artifact-publications/components/publication-content";
import { useFreshShared } from "@/features/artifact-publications/hooks/use-fresh-shared";
import { ApprovalMfa } from "@/features/guest-fixed-approvals/components/approval-mfa";
import {
  reviewItemStatus,
  reviewRequestStatus,
  reviewTargetKind,
  reviewTargetTitle,
} from "@/features/requirements/lib/requirement-workflow-review";
import { ApiError } from "@/lib/api/error";
import type {
  RequirementReviewAnchor,
  SharedRequirementReviewNodes,
} from "@/lib/api/generated/model";
import { formatDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";

import { confirmNode, readNodes, readReview, submitReview } from "../lib/api";
import { GuestReviewDiscussion } from "./discussion";

function isAccessError(error: unknown) {
  return error instanceof ApiError && [401, 403, 404].includes(error.status);
}

const anchorFields: Record<string, string[]> = {
  requirement_document: [
    "purpose",
    "project_goal",
    "project_scope",
    "project_completion_criteria",
  ],
  section: ["content"],
  requirement: ["description", "rationale", "acceptance_criteria"],
};

export function SharedRequirementReviewWorkspace({
  publicationId,
  requestId,
}: {
  publicationId: string;
  requestId: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogTitle = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [anchor, setAnchor] = useState<RequirementReviewAnchor | undefined>();
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<Error | null>(null);
  const mask = useCallback((hidden: boolean) => {
    if (root.current) root.current.hidden = hidden;
    if (hidden) dialog.current?.close();
  }, []);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [review, first] = await Promise.all([
        readReview(publicationId, requestId, { signal }),
        readNodes(publicationId, requestId, { page_size: 25 }, { signal }),
      ]);
      const pages: SharedRequirementReviewNodes[] = [first];
      let cursor = first.next_cursor;
      while (cursor && pages.length < pageCount) {
        const following = await readNodes(
          publicationId,
          requestId,
          { cursor, page_size: 25 },
          { signal },
        );
        pages.push(following);
        cursor = following.next_cursor;
      }
      if (
        pages.some(
          (page) =>
            page.authorization_revision !== review.authorization_revision,
        )
      )
        throw new Error("閲覧許可が更新されました。再確認してください。");
      return {
        review,
        nodes: pages.flatMap((page) => page.items),
        states: pages.flatMap((page) => page.states),
        cursor,
      };
    },
    [publicationId, requestId, pageCount],
  );
  const data = useFreshShared(`${publicationId}:${requestId}`, load, mask);
  const { value, refresh, operationSignal } = data;
  const expiresAt = value?.review.expires_at;
  useEffect(() => {
    if (!expiresAt) return;
    const delay = Math.max(
      0,
      Math.min(Date.parse(expiresAt) - Date.now(), 2_147_483_647),
    );
    const timer = window.setTimeout(() => void refresh(), delay);
    return () => window.clearTimeout(timer);
  }, [expiresAt, refresh]);

  async function change(
    action: (signal: AbortSignal) => Promise<unknown>,
    message: string,
  ) {
    if (!operationSignal || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      await action(operationSignal);
      if (operationSignal.aborted) return;
      dialog.current?.close();
      toast.success(message);
      await refresh();
    } catch (caught) {
      if (!operationSignal.aborted) {
        setError(
          caught instanceof Error
            ? caught
            : new Error("保存できませんでした。"),
        );
        if (isAccessError(caught)) await refresh();
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const route = `/shared/publications/${publicationId}/requirement-reviews/${requestId}`;
  const targets =
    value?.nodes.filter((item) => Boolean(anchorFields[item.node_kind])) ?? [];
  const attachments =
    value?.nodes.filter((item) =>
      ["specification", "test_design", "test_design_part"].includes(
        item.node_kind,
      ),
    ) ?? [];
  const target = targets.find((item) => item.id === selected) ?? targets[0];
  const index = targets.findIndex((item) => item.id === target?.id);
  const states = new Map(
    value?.states.map((item) => [item.node_id, item.status]),
  );
  const state = states.get(target?.id ?? "");
  const review = value?.review;
  const remaining = review
    ? review.requirement_count -
      review.confirmed_count -
      review.changes_requested_count
    : 0;
  function selectTarget(id: string) {
    setSelected(id);
    setAnchor(undefined);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!review) return;
    const input = new FormData(event.currentTarget);
    void change(
      (signal) =>
        submitReview(
          publicationId,
          requestId,
          {
            version: review.version,
            confirm_remaining: input.has("remaining"),
            note: String(input.get("note") ?? "").trim() || undefined,
          },
          { signal },
        ),
      "レビュー結果を提出しました",
    );
  }

  return (
    <div className="grid min-w-0 gap-5">
      <Link
        href="/shared/publications"
        prefetch={false}
        className="flex w-fit items-center gap-2 rounded-sm text-sm text-muted-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ArrowLeftIcon className="size-4" aria-hidden /> 共有一覧へ戻る
      </Link>
      <div ref={root} className="grid min-w-0 gap-5">
        {data.error instanceof ApiError &&
        data.error.code === "MFA_REQUIRED" ? (
          <ApprovalMfa returnTo={route} />
        ) : data.error ? (
          <DataLoadError
            resourceName="レビュー依頼"
            onRetry={() => void refresh()}
          />
        ) : !review || !value ? (
          <Skeleton className="h-40" />
        ) : (
          <>
            <header className="grid gap-3 border-b pb-4">
              <h1 className="text-xl font-semibold [overflow-wrap:anywhere] sm:text-2xl">
                {review.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <Badge variant="outline">
                  {review.responded
                    ? "提出済み"
                    : reviewRequestStatus[review.status]}
                </Badge>
                <span className="flex items-center gap-1">
                  <LockIcon className="size-3.5" aria-hidden /> 対象版{" "}
                  {review.version_label}
                </span>
                {review.due_on ? (
                  <time dateTime={review.due_on}>
                    回答期限 {formatDate(review.due_on)}
                  </time>
                ) : null}
              </div>
              {review.note ? (
                <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">
                  {review.note}
                </p>
              ) : null}
              <div className="grid gap-2 rounded-lg bg-muted/60 p-3">
                <label
                  htmlFor="guest-review-progress"
                  className="flex justify-between gap-2 text-sm"
                >
                  要件の確認状況{" "}
                  <strong className="tabular-nums">
                    {review.confirmed_count} / {review.requirement_count}件
                  </strong>
                </label>
                <progress
                  id="guest-review-progress"
                  className="block h-2 w-full accent-primary"
                  value={review.confirmed_count}
                  max={Math.max(1, review.requirement_count)}
                />
                {review.changes_requested_count ? (
                  <p className="text-xs text-muted-foreground">
                    修正依頼あり {review.changes_requested_count}件
                  </p>
                ) : null}
              </div>
            </header>
            <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(10rem,1fr)_minmax(0,3fr)] xl:grid-cols-[minmax(10rem,1fr)_minmax(0,2.7fr)_minmax(15rem,1.3fr)]">
              <nav aria-label="確認対象" className="min-w-0">
                <label className="grid gap-2 text-sm lg:hidden">
                  確認対象
                  <select
                    value={target?.id ?? ""}
                    onChange={(event) => selectTarget(event.target.value)}
                    className="w-full rounded-md border bg-background p-2"
                  >
                    {targets.map((item) => (
                      <option key={item.id} value={item.id}>
                        {reviewTargetTitle(item)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="hidden lg:block">
                  <h2 className="pb-2 text-sm font-semibold">確認対象</h2>
                  <ul className="max-h-[65dvh] space-y-1 overflow-y-auto">
                    {targets.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          aria-current={
                            item.id === target?.id ? "true" : undefined
                          }
                          className={cn(
                            "w-full rounded-sm px-2 py-2 text-start text-sm [overflow-wrap:anywhere] hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
                            item.id === target?.id && "bg-muted font-medium",
                            item.node_kind === "requirement" && "ps-5",
                          )}
                          onClick={() => selectTarget(item.id)}
                        >
                          {states.get(item.id) === "confirmed" ? (
                            <CheckIcon
                              className="me-1 inline size-3"
                              aria-label="確認済み"
                            />
                          ) : null}
                          {reviewTargetTitle(item)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                {value.cursor && !attachments.length ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPageCount((count) => count + 1)}
                  >
                    確認対象をさらに表示
                  </Button>
                ) : null}
              </nav>
              {target ? (
                <>
                  <section
                    aria-label="固定した本文"
                    className="grid min-w-0 content-start gap-4 lg:border-s lg:ps-5"
                  >
                    <p className="text-xs text-muted-foreground">
                      {typeof target.payload.requirement_code === "string"
                        ? `${target.payload.requirement_code} ・ `
                        : ""}
                      {reviewTargetKind[target.node_kind]}
                    </p>
                    <PublicNode
                      node={target}
                      reader
                      onSelectText={
                        review.can_discuss
                          ? (field, quote, quoteStart) => {
                              if (
                                anchorFields[target.node_kind]?.includes(field)
                              )
                                setAnchor({
                                  field,
                                  quote,
                                  quote_start: quoteStart,
                                });
                            }
                          : undefined
                      }
                    />
                    {value.nodes
                      .filter(
                        (node) =>
                          node.parent_id === target.id &&
                          node.node_kind === "requirement_detail",
                      )
                      .map((detail) => (
                        <PublicNode key={detail.id} node={detail} reader />
                      ))}
                    {target.node_kind === "requirement" && state ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline">
                          {reviewItemStatus[state]}
                        </Badge>
                        {review.can_respond && state !== "changes_requested" ? (
                          <Button
                            type="button"
                            disabled={busy}
                            variant={
                              state === "confirmed" ? "outline" : "default"
                            }
                            onClick={() =>
                              void change(
                                (signal) =>
                                  confirmNode(
                                    publicationId,
                                    requestId,
                                    target.id,
                                    {
                                      version: review.version,
                                      confirmed: state !== "confirmed",
                                    },
                                    { signal },
                                  ),
                                state === "confirmed"
                                  ? "確認を取り消しました"
                                  : "確認しました",
                              )
                            }
                          >
                            {state === "confirmed"
                              ? "確認を取り消す"
                              : "確認済みにする"}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </section>
                  <GuestReviewDiscussion
                    key={target.id}
                    publicationId={publicationId}
                    requestId={requestId}
                    nodeId={target.id}
                    review={review}
                    anchor={anchor}
                    clearAnchor={() => setAnchor(undefined)}
                    onRefresh={refresh}
                    onAccessError={isAccessError}
                  />
                </>
              ) : null}
            </div>
            {attachments.length ? (
              <details className="rounded-md border p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  添付資料
                </summary>
                <div className="mt-4">
                  {value.cursor ? (
                    <Button
                      variant="outline"
                      onClick={() => setPageCount((count) => count + 1)}
                    >
                      添付資料をさらに読み込む
                    </Button>
                  ) : (
                    <PublicationBody
                      nodes={attachments}
                      publicationId={publicationId}
                      reader
                    />
                  )}
                </div>
              </details>
            ) : null}
            <footer className="grid gap-3 border-t pt-4">
              <FormApiError error={error} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={index <= 0}
                    onClick={() => selectTarget(targets[index - 1].id)}
                  >
                    <ChevronLeftIcon data-icon="inline-start" /> 前の対象
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={index < 0 || index + 1 >= targets.length}
                    onClick={() => selectTarget(targets[index + 1].id)}
                  >
                    次の対象 <ChevronRightIcon data-icon="inline-end" />
                  </Button>
                </div>
                {review.can_respond ? (
                  <Button
                    disabled={busy}
                    onClick={() => {
                      setError(null);
                      dialog.current?.showModal();
                    }}
                  >
                    レビュー結果を提出
                  </Button>
                ) : null}
              </div>
            </footer>
            <dialog
              ref={dialog}
              aria-labelledby={dialogTitle}
              className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-auto overscroll-contain rounded-lg border bg-background text-foreground backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-black/50"
            >
              <form className="grid gap-4 p-5" onSubmit={submit}>
                <h1 id={dialogTitle} className="text-lg font-semibold">
                  レビュー結果を提出
                </h1>
                {remaining > 0 ? (
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="remaining"
                      required
                      className="mt-0.5"
                    />
                    残りの{remaining}件を確認済みとして提出する
                  </label>
                ) : null}
                <label className="grid gap-1 text-sm">
                  提出メモ（任意）
                  <Textarea name="note" maxLength={2000} />
                </label>
                <FormApiError error={error} />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => dialog.current?.close()}
                  >
                    戻る
                  </Button>
                  <Button type="submit" disabled={busy}>
                    提出する
                  </Button>
                </div>
              </form>
            </dialog>
          </>
        )}
      </div>
    </div>
  );
}

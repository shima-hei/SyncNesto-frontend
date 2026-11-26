"use client";

import { useState, type ComponentProps } from "react";
import Link from "next/link";
import { ChevronRightIcon, CircleAlertIcon } from "lucide-react";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  correctionStatus,
  requirementWorkflowHref,
  reviewRequestStatus,
} from "@/features/requirements/lib/requirement-workflow-review";
import {
  requirementReviewManagementPageSize as pageSize,
  useRequirementReviewManagement,
} from "../../../hooks/use-requirement-review-management";
import type { RequirementWorkflowRead } from "@/lib/api/generated/model";
import { formatDate } from "@/lib/format/date";

import { RequirementOpenIssuesSection } from "../../sections/requirement-open-issues-section";
import { RequirementReviewRequests } from "./requirement-review-requests";

const states = [
  { value: "open", label: "未解決", resolved: false },
  { value: "resolved", label: "解決済み", resolved: true },
  { value: "all", label: "すべて", resolved: undefined },
] as const;

function formalStatus(formal: RequirementWorkflowRead | null) {
  if (!formal) return "未申請";
  return formal.status === "requested"
    ? "承認待ち"
    : reviewRequestStatus[formal.status];
}

export function RequirementReviewManagement(
  props: Omit<
    ComponentProps<typeof RequirementOpenIssuesSection>,
    "resolved" | "onCreated"
  >,
) {
  const { projectId, documentId } = props;
  const [state, setState] = useState<(typeof states)[number]>(states[0]);
  const [page, setPage] = useState(1);
  const query = useRequirementReviewManagement(projectId, documentId, {
    view: state.value,
    resolved: state.resolved ?? null,
    page,
  });
  const data = query.data;
  if (data && !query.isPlaceholderData) {
    const lastPage = Math.max(1, Math.ceil(data.correction_total / pageSize));
    if (page > lastPage) setPage(lastPage);
  }
  const review = data?.current_review;
  const participants = review?.participants ?? [];
  const answered = participants.filter(
    (person) => person.status !== "pending",
  ).length;
  const open = data ? data.open_correction_count + data.open_issue_count : null;
  const done = data
    ? data.resolved_correction_count + data.resolved_issue_count
    : null;
  const blocking = data
    ? data.open_correction_count + data.blocking_issue_count
    : null;

  return (
    <div className="grid min-w-0 gap-5">
      <section
        aria-label="レビューと正式承認の状況"
        className="grid min-w-0 gap-4 border-b pb-5"
      >
        {query.isError ? (
          <DataLoadError
            resourceName="レビューと正式承認の状況"
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        ) : data ? (
          <>
            <dl className="grid grid-cols-3 gap-3 py-2">
              <div>
                <dt className="text-xs text-muted-foreground">担当者の回答</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {review ? `${answered}/${participants.length}` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">未解決</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {open}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">正式承認</dt>
                <dd className="mt-1 font-semibold">
                  {data.formal_approval ? (
                    <Link
                      className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      href={requirementWorkflowHref(
                        projectId,
                        data.formal_approval.id,
                      )}
                    >
                      {formalStatus(data.formal_approval)}
                    </Link>
                  ) : (
                    formalStatus(null)
                  )}
                </dd>
              </div>
            </dl>
            {review ? (
              <div className="grid gap-2 border-t pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">
                    {review.status === "requested"
                      ? "進行中のレビュー"
                      : "直近のレビュー"}
                  </h2>
                  <Link
                    className="flex items-center gap-1 rounded-sm text-sm hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    href={requirementWorkflowHref(projectId, review.id)}
                  >
                    {review.version_label}{" "}
                    <ChevronRightIcon className="size-4" aria-hidden />
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span>{review.target_title}</span>
                  <Badge variant="outline">
                    {reviewRequestStatus[review.status]}
                  </Badge>
                  {review.due_on ? (
                    <time
                      dateTime={review.due_on}
                      className="text-muted-foreground"
                    >
                      回答期限 {formatDate(review.due_on)}
                    </time>
                  ) : null}
                </div>
                <ul className="divide-y">
                  {participants.map((person) => (
                    <li
                      key={person.user_id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                    >
                      <span>{person.name ?? "案件メンバー"}</span>
                      <span className="text-muted-foreground">
                        {person.status === "pending"
                          ? "確認待ち"
                          : person.status === "confirmed"
                            ? "確認完了"
                            : "修正依頼を提出済み"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                レビュー依頼はまだありません。
              </p>
            )}
            <details className="text-sm">
              <summary className="cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-ring">
                この定義書の依頼一覧
                {data.active_review_count > 0
                  ? `（レビュー中 ${data.active_review_count}件）`
                  : ""}
              </summary>
              <div className="pt-3">
                <RequirementReviewRequests
                  projectId={projectId}
                  documentId={documentId}
                />
              </div>
            </details>
          </>
        ) : (
          <Skeleton className="h-24 w-full" />
        )}
      </section>

      <section aria-label="指摘・未決事項" className="grid min-w-0 gap-4">
        <h2 className="font-semibold">指摘・未決事項</h2>
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="解決状況で絞り込む"
        >
          {states.map((option) => {
            const count =
              option.value === "open"
                ? open
                : option.value === "resolved"
                  ? done
                  : open !== null && done !== null
                    ? open + done
                    : null;
            return (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={state.value === option.value ? "secondary" : "ghost"}
                aria-pressed={state.value === option.value}
                onClick={() => {
                  setState(option);
                  setPage(1);
                }}
              >
                {option.label}
                {count !== null ? ` ${count}` : ""}
              </Button>
            );
          })}
        </div>
        <div className="grid min-w-0 gap-3" aria-busy={query.isFetching}>
          <h3 className="text-sm font-semibold">修正指摘</h3>
          {query.isPending ? <Skeleton className="h-12 w-full" /> : null}
          {data?.corrections.length ? (
            <ul className="divide-y border-y">
              {data.corrections.map((item) => (
                <li key={item.id}>
                  <Link
                    className="flex min-w-0 flex-wrap items-start justify-between gap-2 rounded-sm py-3 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
                    href={requirementWorkflowHref(projectId, item.request_id, {
                      nodeId: item.node_id,
                      threadId: item.id,
                    })}
                  >
                    <span className="grid min-w-0 gap-1">
                      <span className="text-xs text-muted-foreground">
                        {item.version_label}
                      </span>
                      <span className="text-sm font-medium [overflow-wrap:anywhere]">
                        {item.title}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {item.assignee_name ? (
                        <span>{item.assignee_name}</span>
                      ) : null}
                      <Badge variant="outline">
                        {correctionStatus[item.status]}
                      </Badge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : data ? (
            <p className="text-sm text-muted-foreground">
              該当する修正指摘はありません。
            </p>
          ) : null}
          {data && data.correction_total > pageSize ? (
            <DataPagination
              page={page}
              pageSize={pageSize}
              total={data.correction_total}
              currentCount={data.corrections.length}
              isFetching={query.isFetching}
              onPageChange={setPage}
            />
          ) : null}
        </div>
        <RequirementOpenIssuesSection
          {...props}
          resolved={state.resolved}
          onCreated={() => {
            setState(states[0]);
            setPage(1);
          }}
        />
        {blocking ? (
          <p className="flex items-start gap-2 border-t pt-3 text-sm text-[var(--status-warning-fg)]">
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            正式承認までに対応が必要な項目が {blocking} 件あります。
          </p>
        ) : null}
      </section>
    </div>
  );
}

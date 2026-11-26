"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { CommentContent } from "@/components/shared/comments/comment-content";
import { ActivityTimelineItem } from "@/components/shared/detail/activity-timeline-item";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useProjectMemberUsers } from "@/features/projects/hooks/use-project-member-users";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import { listRequirementWorkflowProjectsProjectIdRequirementWorkflowGet as listReviews } from "@/lib/api/generated/requirement-workflow/requirement-workflow";
import {
  getListRequirementChangeLogsProjectsProjectIdChangeLogsGetQueryKey as changeLogKey,
  listRequirementChangeLogsProjectsProjectIdChangeLogsGet as listChanges,
} from "@/lib/api/generated/requirements/requirements";
import { getVisibleChangeLogs } from "@/lib/change-log/display";
import { formatDate, formatDateTime } from "@/lib/format/date";

import { useRequirementSections } from "../../hooks/use-requirement-sections";
import { useTargetComments } from "../../hooks/use-target-comments";
import { getRequirementCommentAnchorLabel } from "../../lib/requirement-comment-anchor";
import {
  requirementWorkflowHref,
  reviewRequestStatus,
  reviewTargetKind,
} from "../../lib/requirement-workflow-review";
import { RequirementChangeLogItem } from "./requirement-change-logs-section";

const pageSize = 20;
const sourcePageSize = 100;

async function readActivityRecords<T extends { id: string | number }>(
  readPage: (page: number) => Promise<{ items: T[]; total: number }>,
) {
  const firstPage = await readPage(1);
  const records = new Map(firstPage.items.map((item) => [item.id, item]));
  for (
    let page = 2;
    page <= Math.ceil(firstPage.total / sourcePageSize);
    page++
  ) {
    const { items } = await readPage(page);
    for (const item of items) records.set(item.id, item);
  }
  return Array.from(records.values());
}

export function RequirementItemActivity({
  projectId,
  documentId,
  requirementId,
}: {
  projectId: number;
  documentId: number;
  requirementId: number;
}) {
  const [requestedPage, setPage] = useState(1);
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { sections } = useRequirementSections(projectId, documentId);
  const { users } = useProjectMemberUsers(projectId, { limit: 100 });
  const comments = useTargetComments(
    projectId,
    "requirement_item",
    requirementId,
  );
  const changes = useQuery({
    queryKey: [
      ...changeLogKey(projectId),
      "item-activity",
      documentId,
      requirementId,
    ],
    queryFn: ({ signal }) =>
      readActivityRecords((page) =>
        listChanges(
          projectId,
          {
            document_id: documentId,
            target_type: "requirement",
            target_id: requirementId,
            page,
            page_size: sourcePageSize,
          },
          { signal },
        ),
      ),
    retry: false,
  });
  const canReadReviews = Boolean(
    user?.user_type === "internal" && !user.demo && tenant,
  );
  const reviews = useQuery({
    queryKey: [
      "requirement-workflow",
      projectId,
      "item-activity",
      documentId,
      requirementId,
      tenant?.id,
      user?.id,
    ],
    queryFn: ({ signal }) =>
      readActivityRecords((page) =>
        listReviews(
          projectId,
          {
            document_id: documentId,
            requirement_id: requirementId,
            kind: "review",
            page,
            page_size: sourcePageSize,
          },
          { signal },
        ),
      ),
    enabled: canReadReviews,
    retry: false,
  });
  const records = useMemo(() => {
    const entries = [
      ...comments.comments.map((comment) => ({
        kind: "comment" as const,
        key: `comment-${comment.id}`,
        date: comment.created_at,
        comment,
      })),
      ...getVisibleChangeLogs(changes.data ?? []).map((change) => ({
        kind: "change" as const,
        key: `change-${change.id}`,
        date: change.changed_at,
        change,
      })),
      ...(canReadReviews ? (reviews.data ?? []) : []).map((review) => ({
        kind: "review" as const,
        key: `review-${review.id}`,
        date: review.created_at,
        review,
      })),
    ];
    return entries.sort(
      (a, b) =>
        Date.parse(b.date) - Date.parse(a.date) || a.key.localeCompare(b.key),
    );
  }, [comments.comments, changes.data, canReadReviews, reviews.data]);
  const labels = {
    members: new Map(users.map((user) => [user.id, user.name])),
    chapters: new Map(sections.map((section) => [section.id, section.title])),
  };
  const loading = comments.isLoading || changes.isLoading || reviews.isLoading;
  const page = Math.min(
    requestedPage,
    Math.max(1, Math.ceil(records.length / pageSize)),
  );
  const visible = records.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="grid min-w-0 gap-3">
      {comments.error ? (
        <DataLoadError
          resourceName="コメント"
          onRetry={() => void comments.refetch()}
        />
      ) : null}
      {changes.error ? (
        <DataLoadError
          resourceName="変更履歴"
          onRetry={() => void changes.refetch()}
        />
      ) : null}
      {reviews.error && canReadReviews ? (
        <DataLoadError
          resourceName="レビュー依頼"
          onRetry={() => void reviews.refetch()}
        />
      ) : null}
      {loading ? (
        <p className="text-sm text-muted-foreground">
          アクティビティを読み込み中…
        </p>
      ) : visible.length ? (
        <>
          <ol
            role="list"
            aria-label="アクティビティのタイムライン"
            className="ms-1"
          >
            {visible.map((entry) => {
              if (entry.kind === "change") {
                return (
                  <RequirementChangeLogItem
                    key={entry.key}
                    changeLog={entry.change}
                    labels={labels}
                    timeline
                  />
                );
              }
              if (entry.kind === "comment") {
                const { comment } = entry;
                const anchor = getRequirementCommentAnchorLabel(
                  comment.target_anchor,
                );
                return (
                  <ActivityTimelineItem
                    key={entry.key}
                    occurredAt={entry.date}
                    timeLabel={formatDateTime(entry.date)}
                    actorLabel={comment.author?.name ?? "投稿者不明"}
                    actorAvatarUrl={comment.author?.avatar_url}
                    actionLabel={
                      comment.parent_comment_id
                        ? "コメントに返信"
                        : "コメントを追加"
                    }
                    detailLabel="コメントを表示"
                  >
                    {anchor ? (
                      <p className="text-muted-foreground">対象 {anchor}</p>
                    ) : null}
                    <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">
                      <CommentContent
                        body={comment.body}
                        mentions={comment.mentions}
                      />
                    </p>
                  </ActivityTimelineItem>
                );
              }
              const { review } = entry;
              return (
                <ActivityTimelineItem
                  key={entry.key}
                  occurredAt={entry.date}
                  timeLabel={formatDateTime(entry.date)}
                  actorLabel={review.requester_name ?? "依頼者不明"}
                  actionLabel="レビューを依頼"
                  description={
                    <span className="text-xs text-muted-foreground">
                      {review.version_label}
                    </span>
                  }
                  detailLabel="依頼内容を表示"
                >
                  <p className="text-sm [overflow-wrap:anywhere]">
                    {reviewTargetKind[review.scope_kind]}「{review.target_title}
                    」・ {reviewRequestStatus[review.status]}
                  </p>
                  {review.due_on ? (
                    <p className="text-muted-foreground">
                      回答期限 {formatDate(review.due_on)}
                    </p>
                  ) : null}
                  {review.note ? (
                    <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">
                      {review.note}
                    </p>
                  ) : null}
                  <Link
                    className="inline-block rounded-sm text-sm underline underline-offset-4"
                    href={requirementWorkflowHref(projectId, review.id)}
                    prefetch={false}
                  >
                    レビュー依頼を開く（{review.version_label}）
                  </Link>
                </ActivityTimelineItem>
              );
            })}
          </ol>
          <DataPagination
            page={page}
            pageSize={pageSize}
            total={records.length}
            currentCount={visible.length}
            isFetching={changes.isFetching || reviews.isFetching}
            onPageChange={setPage}
          />
        </>
      ) : !comments.error && !changes.error && !reviews.error ? (
        <p className="text-sm text-muted-foreground">
          アクティビティはまだありません。
        </p>
      ) : null}
    </div>
  );
}

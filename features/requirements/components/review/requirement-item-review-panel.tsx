"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { useRequirementItemWorkflow } from "../../hooks/use-requirement-item-workflow";
import { useProjectMemberUsers } from "@/features/projects/hooks/use-project-member-users";
import { RequirementItemReviewBadge } from "./requirement-item-workflow";
import {
  listWorkflowReviewThreadsProjectsProjectIdRequirementWorkflowRequestIdReviewThreadsGet as listThreads,
  readRequirementWorkflowProjectsProjectIdRequirementWorkflowRequestIdGet as readRequest,
} from "@/lib/api/generated/requirement-workflow/requirement-workflow";
import { listOpenIssuesProjectsProjectIdOpenIssuesGet as listIssues } from "@/lib/api/generated/requirements/requirements";
import { formatDateTime } from "@/lib/format/date";
import { getRequirementOpenIssueStatusLabel } from "../../constants/requirement-options";
import {
  correctionStatus,
  requirementWorkflowHref,
  reviewRequestStatus,
} from "../../lib/requirement-workflow-review";

export function RequirementItemReviewPanel({
  projectId,
  documentId,
  requirementId,
  workflow,
}: {
  projectId: number;
  documentId: number;
  requirementId: number;
  workflow: ReturnType<typeof useRequirementItemWorkflow>;
}) {
  const state = workflow.data?.[0];
  const requestId = state?.review_request_id ?? "";
  const itemNodeId = state?.review_item_node_id ?? "";
  const request = useQuery({
    queryKey: ["requirement-item-review", projectId, requestId],
    queryFn: ({ signal }) => readRequest(projectId, requestId, { signal }),
    enabled: Boolean(requestId),
    retry: false,
  });
  const threads = useQuery({
    queryKey: [
      "requirement-item-review-threads",
      projectId,
      requestId,
      itemNodeId,
    ],
    queryFn: ({ signal }) =>
      listThreads(
        projectId,
        requestId,
        {
          active_only: true,
          node_id: itemNodeId,
          page_size: 100,
        },
        { signal },
      ),
    enabled: Boolean(requestId && itemNodeId),
    retry: false,
  });
  const issues = useQuery({
    queryKey: [
      "requirement-item-open-issues",
      projectId,
      documentId,
      requirementId,
    ],
    queryFn: ({ signal }) =>
      listIssues(
        projectId,
        {
          document_id: documentId,
          related_requirement_id: requirementId,
          resolved: false,
          page_size: 10,
        },
        { signal },
      ),
    retry: false,
  });
  const corrections =
    threads.data?.items.filter((thread) => thread.kind === "correction") ?? [];
  const { users } = useProjectMemberUsers(projectId, { limit: 100 });
  const participantNames = new Map(
    request.data?.participants.map((person) => [person.user_id, person.name]),
  );
  const memberNames = new Map(users.map((member) => [member.id, member.name]));
  const confirmed =
    request.data?.participants.filter((person) => person.status === "confirmed")
      .length ?? 0;
  const documentHref = `/projects/joined/${projectId}/requirements/${documentId}?tab=approvals`;

  return (
    <section aria-label="レビューの確認状況" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">確認状況</h2>

        <div className="flex flex-wrap items-center gap-2">
          {state ? <RequirementItemReviewBadge review={state.review} /> : null}
          {request.data ? (
            <Badge variant="outline">
              {reviewRequestStatus[request.data.status]}
            </Badge>
          ) : null}
        </div>
      </div>
      {workflow.error ? (
        <DataLoadError
          resourceName="確認状況"
          onRetry={() => void workflow.refetch()}
        />
      ) : workflow.isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">
          確認状況を取得しています…
        </p>
      ) : requestId ? (
        request.error ? (
          <DataLoadError
            resourceName="レビュー依頼"
            onRetry={() => void request.refetch()}
          />
        ) : request.data ? (
          <div className="grid gap-2 border-y py-3">
            <p className="text-sm text-muted-foreground">
              対象版 {request.data.version_label} ・ 確認済み {confirmed}/
              {request.data.participants.length}名
            </p>
            <ul className="divide-y">
              {request.data.participants.map((person) => (
                <li
                  key={person.user_id}
                  className="flex flex-wrap justify-between gap-1 py-2 text-sm"
                >
                  <span>{person.name ?? "担当者"}</span>
                  <span className="text-muted-foreground">
                    {person.status === "confirmed"
                      ? "確認済み"
                      : person.status === "changes_requested"
                        ? "修正依頼あり"
                        : "確認待ち"}
                    {person.responded_at
                      ? ` ・ ${formatDateTime(person.responded_at)}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
            {request.data.due_on ? (
              <p className="text-sm text-muted-foreground">
                回答期限 {request.data.due_on}
              </p>
            ) : null}
            <Button
              asChild
              size="sm"
              variant="outline"
              className="justify-self-start"
            >
              <Link href={requirementWorkflowHref(projectId, requestId)}>
                レビュー依頼を開く
              </Link>
            </Button>
          </div>
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            レビュー依頼を取得しています…
          </p>
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          この要件を含むレビュー依頼はありません。
        </p>
      )}
      <section aria-label="修正依頼・未決事項" className="grid gap-2">
        <h3 className="text-sm font-semibold">修正依頼・未決事項</h3>
        {threads.error ? (
          <DataLoadError
            resourceName="修正依頼"
            onRetry={() => void threads.refetch()}
          />
        ) : null}
        {issues.error ? (
          <DataLoadError
            resourceName="未決事項"
            onRetry={() => void issues.refetch()}
          />
        ) : null}
        {corrections.length || issues.data?.items.length ? (
          <ul className="divide-y border-y">
            {corrections.map((thread) => (
              <li
                key={thread.id}
                className="flex min-w-0 items-start justify-between gap-2 py-2 text-sm"
              >
                <Link
                  className="min-w-0 break-words hover:underline"
                  href={requirementWorkflowHref(projectId, requestId, {
                    nodeId: thread.node_id,
                    threadId: thread.id,
                  })}
                >
                  {thread.body}
                  <span className="block text-xs text-muted-foreground">
                    修正依頼
                    {participantNames.get(thread.author_id) ||
                    memberNames.get(thread.author_id)
                      ? ` ・ ${participantNames.get(thread.author_id) ?? memberNames.get(thread.author_id)}`
                      : ""}
                  </span>
                </Link>
                <Badge variant="outline">
                  {correctionStatus[thread.status]}
                </Badge>
              </li>
            ))}
            {issues.data?.items.map((issue) => (
              <li
                key={issue.id}
                className="flex min-w-0 items-start justify-between gap-2 py-2 text-sm"
              >
                <Link
                  className="min-w-0 break-words hover:underline"
                  href={documentHref}
                >
                  {issue.title}
                  <span className="block text-xs text-muted-foreground">
                    未決事項
                  </span>
                </Link>
                <Badge variant="outline">
                  {getRequirementOpenIssueStatusLabel(issue.status)}
                </Badge>
              </li>
            ))}
          </ul>
        ) : !issues.isPending &&
          !(threads.isFetching || threads.error || issues.error) ? (
          <p className="text-sm text-muted-foreground">
            対応中の修正依頼・未決事項はありません。
          </p>
        ) : null}
        {threads.data && threads.data.total > threads.data.items.length ? (
          <Link
            className="w-fit text-xs underline underline-offset-4"
            href={requirementWorkflowHref(projectId, requestId)}
          >
            レビュー依頼で残りの指摘を確認
          </Link>
        ) : null}
        {issues.data && issues.data.total > issues.data.items.length ? (
          <Link
            className="w-fit text-xs underline underline-offset-4"
            href={documentHref}
          >
            定義書で残りの未決事項を確認
          </Link>
        ) : null}
      </section>
      <Link
        href={documentHref}
        className="w-fit border-t pt-3 text-sm underline underline-offset-4"
      >
        要件定義書の正式承認状況
      </Link>
    </section>
  );
}

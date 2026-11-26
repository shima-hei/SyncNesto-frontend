"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FileCheckIcon, MessageSquareIcon } from "lucide-react";
import Link from "next/link";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Badge } from "@/components/ui/badge";
import { reviewRequestStatus } from "@/features/requirements/lib/requirement-workflow-review";
import { listRequirementWorkflowProjectsProjectIdRequirementWorkflowGet as listWorkflow } from "@/lib/api/generated/requirement-workflow/requirement-workflow";

export function RequirementReviewRequests({
  projectId,
  documentId,
}: {
  projectId: number;
  documentId: number;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const query = useQuery({
    queryKey: ["requirement-workflow", projectId, documentId, page],
    queryFn: ({ signal }) =>
      listWorkflow(
        projectId,
        { document_id: documentId, page, page_size: pageSize },
        { signal },
      ),
    placeholderData: keepPreviousData,
    retry: false,
  });
  return (
    <section
      aria-label="レビュー・正式承認の依頼"
      className="flex min-w-0 flex-col gap-3 border-b pb-4"
    >
      <h2 className="text-base font-semibold">レビュー・正式承認の依頼</h2>
      {query.error ? (
        <DataLoadError
          resourceName="レビュー・正式承認の依頼"
          onRetry={() => void query.refetch()}
        />
      ) : query.isPending ? (
        <p className="text-sm text-muted-foreground" role="status">
          依頼を読み込んでいます…
        </p>
      ) : query.data.items.length ? (
        <ul className="divide-y border-y">
          {query.data.items.map((entry) => (
            <li
              key={entry.id}
              className="flex min-w-0 flex-wrap items-start justify-between gap-3 py-3"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <Link
                  href={`/projects/joined/${projectId}/requirement-workflow/${entry.id}`}
                  className="flex min-w-0 items-center gap-2 rounded-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {entry.kind === "formal_approval" ? (
                    <FileCheckIcon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : (
                    <MessageSquareIcon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                  <span className="break-words">{entry.target_title}</span>
                </Link>
                <span className="text-xs text-muted-foreground">
                  {entry.version_label} ・{" "}
                  {entry.participants
                    .map((item) => item.name ?? "担当者")
                    .join("、")}
                  {entry.due_on ? ` · 回答期限 ${entry.due_on}` : ""}
                </span>
              </div>
              <Badge variant="outline">
                {entry.kind === "formal_approval" &&
                entry.status === "requested"
                  ? "承認待ち"
                  : reviewRequestStatus[entry.status]}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          レビュー・正式承認の依頼はまだありません。
        </p>
      )}
      {query.data && query.data.total > pageSize ? (
        <DataPagination
          page={query.data.page}
          pageSize={pageSize}
          total={query.data.total}
          currentCount={query.data.items.length}
          isFetching={query.isFetching}
          onPageChange={setPage}
        />
      ) : null}
    </section>
  );
}

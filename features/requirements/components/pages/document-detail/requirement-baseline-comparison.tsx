"use client";

import Link from "next/link";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { GitCompareArrowsIcon } from "lucide-react";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { readRequirementBaselineComparisonProjectsProjectIdRequirementDocumentsDocumentIdBaselineComparisonGet as readComparison } from "@/lib/api/generated/requirement-workflow/requirement-workflow";

const pageSize = 15;
const changeLabels = { added: "追加", changed: "変更", removed: "削除" };
const kindLabels = {
  requirement_document: "文書全体",
  section: "章",
  requirement: "要件",
};
const fieldLabels: Record<string, string> = {
  title: "タイトル",
  document_code: "文書コード",
  requirement_code: "要件コード",
  content: "章の本文",
  section_type: "章の種別",
  description: "要件の内容",
  rationale: "理由",
  acceptance_criteria: "受け入れ条件",
  priority: "優先度",
  category: "カテゴリ",
  requirement_type: "種別",
  parent: "所属する章",
  position: "並び順",
  details: "実現内容",
  purpose: "目的",
  background: "背景",
  scope: "対象範囲",
  out_of_scope: "対象外",
  assumptions: "前提条件",
  constraints: "制約事項",
  project_goal: "案件目標",
  project_scope: "案件の対象範囲",
  project_completion_criteria: "案件の完了条件",
};

export function RequirementBaselineComparison({
  projectId,
  documentId,
  baselineId,
  documentVersion,
}: {
  projectId: number;
  documentId: number;
  baselineId: string;
  documentVersion: number;
}) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: [
      "requirement-workflow",
      projectId,
      "baseline-comparison",
      documentId,
      baselineId,
      documentVersion,
      page,
    ],
    queryFn: ({ signal }) =>
      readComparison(
        projectId,
        documentId,
        { page, page_size: pageSize },
        { signal },
      ),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const data = query.data;
  if (data && !query.isPlaceholderData) {
    const lastPage = Math.max(1, Math.ceil(data.total / pageSize));
    if (page > lastPage) setPage(lastPage);
  }
  return (
    <section
      aria-label="承認済み版との差分"
      className="grid min-w-0 gap-3 border-b pb-4"
    >
      <h3 className="flex items-center gap-2 font-semibold">
        <GitCompareArrowsIcon className="size-4" aria-hidden />
        承認済み版との差分
      </h3>
      {query.isError ? (
        <DataLoadError
          resourceName="承認済み版との差分"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : query.isPending ? (
        <Skeleton className="h-12 w-full" />
      ) : data ? (
        <>
          <p className="text-sm text-muted-foreground">
            {data.baseline_label} の要件 {data.baseline_count} 件 ・ 現在の要件{" "}
            {data.current_count} 件
          </p>
          <dl className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-baseline gap-2">
              <dt>追加</dt>
              <dd className="font-medium tabular-nums">
                {data.requirement_added}件
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>変更</dt>
              <dd className="font-medium tabular-nums">
                {data.requirement_changed}件
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>削除</dt>
              <dd className="font-medium tabular-nums">
                {data.requirement_removed}件
              </dd>
            </div>
          </dl>
          {data.items.length ? (
            <ul className="divide-y border-y" aria-busy={query.isFetching}>
              {data.items.map((item) => (
                <li
                  key={`${item.kind}-${item.id}`}
                  className="flex min-w-0 flex-wrap items-start justify-between gap-2 py-3"
                >
                  <div className="grid min-w-0 gap-1">
                    <span className="text-xs text-muted-foreground">
                      {kindLabels[item.kind]}
                      {item.requirement_code
                        ? ` ・ ${item.requirement_code}`
                        : ""}
                    </span>
                    {item.kind === "requirement" &&
                    item.change !== "removed" ? (
                      <Link
                        href={`/projects/joined/${projectId}/requirements/${documentId}/items/${item.id}`}
                        className="rounded-sm text-sm font-medium [overflow-wrap:anywhere] hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium [overflow-wrap:anywhere]">
                        {item.title}
                      </span>
                    )}
                    {item.fields.length ? (
                      <span className="text-xs text-muted-foreground">
                        {item.fields
                          .map((field) => fieldLabels[field] ?? "定義書の属性")
                          .join("、")}
                      </span>
                    ) : null}
                  </div>
                  <Badge variant="outline">{changeLabels[item.change]}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              承認対象の内容は開発基準と一致しています。
            </p>
          )}
          {data.total > pageSize ? (
            <DataPagination
              page={data.page}
              pageSize={pageSize}
              total={data.total}
              currentCount={data.items.length}
              isFetching={query.isFetching}
              onPageChange={setPage}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}

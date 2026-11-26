"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRightIcon,
  FileCheckIcon,
  MessageSquareIcon,
  MessageSquareWarningIcon,
} from "lucide-react";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  correctionStatus,
  requirementWorkflowHref,
} from "@/features/requirements/lib/requirement-workflow-review";
import type { HomeRequirementWorkItem } from "@/lib/api/generated/model";

import { useHomeRequirementWork } from "../../hooks/use-home";
import { formatCalendarDate } from "../../lib/home-display";

const pageSize = 8;
const kinds = {
  review: { label: "レビュー", icon: MessageSquareIcon },
  formal_approval: { label: "正式承認", icon: FileCheckIcon },
  correction: { label: "修正依頼", icon: MessageSquareWarningIcon },
};

function workHref(item: HomeRequirementWorkItem) {
  return requirementWorkflowHref(
    item.project_id,
    item.request_id,
    item.kind === "correction" && item.node_id
      ? { nodeId: item.node_id, threadId: item.id }
      : undefined,
  );
}

function workStatus(item: HomeRequirementWorkItem) {
  if (item.kind === "review") return "確認待ち";
  if (item.kind === "formal_approval") return "承認待ち";
  return item.status === "pending" ? "未対応" : correctionStatus[item.status];
}

export function HomeRequirementWorkSection() {
  const [page, setPage] = useState(1);
  const query = useHomeRequirementWork(page, pageSize);
  const data = query.data;
  if (data && !query.isPlaceholderData) {
    const lastPage = Math.max(1, Math.ceil(data.total / pageSize));
    if (page > lastPage) setPage(lastPage);
  }

  return (
    <section
      aria-labelledby="home-requirement-work-title"
      className="grid min-w-0 gap-3"
    >
      <h2 id="home-requirement-work-title" className="text-base font-semibold">
        レビュー・承認の自分の作業
      </h2>
      {query.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : query.isError ? (
        <DataLoadError
          resourceName="レビュー・承認の自分の作業"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : data && data.total > 0 ? (
        <>
          <ul className="divide-y border-y" aria-busy={query.isFetching}>
            {data.items.map((item) => {
              const { icon: Icon, label } = kinds[item.kind];
              return (
                <li key={item.id}>
                  <Link
                    href={workHref(item)}
                    className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-sm p-3 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <Icon
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                    <div className="min-w-0 space-y-1">
                      <p className="line-clamp-2 text-sm font-medium [overflow-wrap:anywhere]">
                        {item.title}
                      </p>
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                        <span>{item.project_name}</span>
                        <span>{label}</span>
                        <span>{item.version_label}</span>
                        {item.due_on ? (
                          <time dateTime={item.due_on}>
                            期限 {formatCalendarDate(item.due_on)}
                          </time>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{workStatus(item)}</Badge>
                      <ChevronRightIcon
                        className="hidden size-4 text-muted-foreground sm:block"
                        aria-hidden
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
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
      ) : (
        <p className="text-sm text-muted-foreground">
          対応が必要なレビュー・承認・修正依頼はありません。
        </p>
      )}
    </section>
  );
}

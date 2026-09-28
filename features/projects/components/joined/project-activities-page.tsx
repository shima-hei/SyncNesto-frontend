"use client";

import { useState } from "react";
import Link from "next/link";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useListProjectActivitiesProjectsProjectIdActivitiesGet } from "@/lib/api/generated/projects/projects";

import { ActivityRows } from "./joined-project-detail-page";

const PAGE_SIZE = 20;

export function ProjectActivitiesPage({ projectId }: { projectId: number }) {
  const [page, setPage] = useState(1);
  const query = useListProjectActivitiesProjectsProjectIdActivitiesGet(
    projectId,
    { page, page_size: PAGE_SIZE },
    { query: { retry: false } },
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="最近の動き"
        description="要件、タスク、テスト設計・実行の変更履歴"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/joined/${projectId}`}>概要へ戻る</Link>
          </Button>
        }
      />
      {query.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : query.error || !query.data ? (
        <DataLoadError
          resourceName="最近の動き"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : (
        <>
          <ActivityRows projectId={projectId} items={query.data.items} />
          <nav
            aria-label="最近の動きのページ"
            className="flex items-center justify-end gap-3 text-sm"
          >
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              前へ
            </Button>
            <span>{page}ページ</span>
            <Button
              variant="outline"
              size="sm"
              disabled={!query.data.has_more}
              onClick={() => setPage(page + 1)}
            >
              次へ
            </Button>
          </nav>
        </>
      )}
    </div>
  );
}

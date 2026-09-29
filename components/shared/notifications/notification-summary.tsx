"use client";

import Link from "next/link";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications } from "@/features/notifications/hooks/use-notifications";

import { NotificationList } from "./notification-list";

export function NotificationSummary({ projectId }: { projectId?: number }) {
  const query = useNotifications({
    page: 1,
    page_size: 5,
    project_id: projectId,
  });
  return (
    <section
      aria-label="あなたへの通知"
      className="flex min-w-0 flex-col gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">あなたへの通知</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link
            href={
              projectId
                ? `/notifications?project=${projectId}`
                : "/notifications"
            }
          >
            すべて見る
          </Link>
        </Button>
      </div>
      {query.isPending ? (
        <Skeleton className="h-28 w-full" />
      ) : query.isError ? (
        <DataLoadError
          resourceName="通知"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : (
        <NotificationList items={query.data.items} compact />
      )}
    </section>
  );
}

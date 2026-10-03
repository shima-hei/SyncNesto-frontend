"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { PageHeader } from "@/components/shared/layout/page-header";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { NotificationList } from "@/components/shared/notifications/notification-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  useNotificationMutations,
  useNotifications,
  useNotificationUnreadCount,
} from "../hooks/use-notifications";

export function NotificationsPage() {
  const params = useSearchParams();
  const parsedProjectId = Number(params.get("project"));
  const projectId =
    Number.isSafeInteger(parsedProjectId) && parsedProjectId > 0
      ? parsedProjectId
      : undefined;
  return <NotificationInbox key={projectId ?? "all"} projectId={projectId} />;
}

function NotificationInbox({ projectId }: { projectId?: number }) {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const query = useNotifications({
    page,
    page_size: 20,
    unread_only: filter === "unread",
    project_id: projectId,
  });
  const unread = useNotificationUnreadCount(projectId);
  const { markAllRead } = useNotificationMutations(projectId);
  const markAll = async () => {
    try {
      await markAllRead.mutateAsync();
      setPage(1);
    } catch {
      toast.error("通知を既読にできませんでした。もう一度お試しください。");
    }
  };
  return (
    <div className="flex min-w-0 max-w-4xl flex-col gap-5">
      <PageHeader
        title="通知"
        description={
          projectId
            ? "この案件であなたに届いた通知"
            : "あなたに届いたすべての案件の通知"
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={!unread.data?.count || markAllRead.isPending}
            onClick={() => void markAll()}
          >
            すべて既読
          </Button>
        }
      />
      {projectId ? (
        <Button variant="ghost" size="sm" className="self-start" asChild>
          <Link href="/notifications">全案件の通知を見る</Link>
        </Button>
      ) : null}
      <Tabs
        value={filter}
        onValueChange={(value) => {
          setFilter(value);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="all">すべて</TabsTrigger>
          <TabsTrigger value="unread">
            未読{unread.data?.count ? ` (${unread.data.count})` : ""}
          </TabsTrigger>
        </TabsList>
        <TabsContent value={filter} className="pt-3">
          {query.isPending ? (
            <div className="flex flex-col gap-3" aria-label="通知を読み込み中">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : query.isError ? (
            <DataLoadError
              resourceName="通知"
              onRetry={() => void query.refetch()}
              isRetrying={query.isFetching}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <NotificationList
                items={query.data.items}
                groupByDate
                onRead={() => {
                  if (filter === "unread") setPage(1);
                }}
              />
              <DataPagination
                page={page}
                pageSize={20}
                total={query.data.total}
                currentCount={query.data.items.length}
                isFetching={query.isFetching}
                onPageChange={setPage}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

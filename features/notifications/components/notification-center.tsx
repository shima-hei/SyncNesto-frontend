"use client";

import { useEffect, useState } from "react";
import { BellIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { NotificationList } from "@/components/shared/notifications/notification-list";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useNotificationMutations,
  useNotifications,
  useNotificationUnreadCount,
} from "../hooks/use-notifications";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const unread = useNotificationUnreadCount();
  const query = useNotifications({ page: 1, page_size: 8 }, open);
  const { markAllRead } = useNotificationMutations();
  const { refetch } = unread;
  useEffect(() => {
    void refetch();
  }, [pathname, refetch]);
  const count = unread.data?.count ?? 0;
  const markAll = async () => {
    try {
      await markAllRead.mutateAsync();
    } catch {
      toast.error("通知を既読にできませんでした。もう一度お試しください。");
    }
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={count ? `通知、未読${count}件` : "通知"}
        >
          <BellIcon data-icon="inline-start" />
          {count ? (
            <span className="text-xs tabular-nums">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={16}
        className="w-[min(25rem,calc(100vw-2rem))] gap-0 p-0"
        aria-label="通知センター"
      >
        <div className="flex items-center justify-between gap-2 p-3">
          <h2 className="text-sm font-semibold">通知</h2>
          <Button
            variant="ghost"
            size="sm"
            disabled={!count || markAllRead.isPending}
            onClick={() => void markAll()}
          >
            すべて既読
          </Button>
        </div>
        <Separator />
        <div className="max-h-[min(26rem,65dvh)] overflow-y-auto overscroll-contain">
          {query.isPending ? (
            <div
              className="flex flex-col gap-3 p-3"
              aria-label="通知を読み込み中"
            >
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : query.isError ? (
            <div className="px-3">
              <DataLoadError
                resourceName="通知"
                onRetry={() => void query.refetch()}
                isRetrying={query.isFetching}
              />
            </div>
          ) : (
            <NotificationList
              items={query.data.items}
              compact
              onNavigate={() => setOpen(false)}
            />
          )}
        </div>
        <Separator />
        <Button variant="ghost" asChild>
          <Link href="/notifications" onClick={() => setOpen(false)}>
            すべての通知を見る
          </Link>
        </Button>
      </PopoverContent>
    </Popover>
  );
}

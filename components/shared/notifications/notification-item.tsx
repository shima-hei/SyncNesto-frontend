"use client";

import { MessageSquareIcon, UserRoundCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { notificationMessage } from "@/features/notifications/lib/notification-display";
import type { NotificationRead } from "@/lib/api/generated/model";
import { formatDateTime, formatRelativeDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";

type Props = {
  notification: NotificationRead;
  compact?: boolean;
  pending?: boolean;
  onOpen: () => void;
  onMarkRead: () => void;
};

export function NotificationItem({
  notification,
  compact = false,
  pending,
  onOpen,
  onMarkRead,
}: Props) {
  const Icon =
    notification.type === "assigned" ? UserRoundCheckIcon : MessageSquareIcon;
  const unavailable = notification.target_status !== "available";
  const content = (
    <>
      <div
        className="flex shrink-0 flex-col items-center gap-2 pt-0.5"
        aria-hidden="true"
      >
        <Icon className="size-4 text-muted-foreground" />
        {!notification.is_read ? (
          <span className="size-1.5 rounded-full bg-foreground" />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="min-w-0 break-words">
            {notification.snapshot.project_name}
          </span>
          <time
            dateTime={notification.created_at}
            title={formatDateTime(notification.created_at)}
          >
            {formatRelativeDate(notification.created_at)}
          </time>
          <span className="sr-only">
            {notification.is_read ? "既読" : "未読"}
          </span>
        </div>
        <p
          className={cn(
            "text-sm leading-6 break-words",
            !notification.is_read && "font-medium",
          )}
        >
          {notificationMessage(notification)}
        </p>
        {notification.snapshot.excerpt ? (
          <p
            className={cn(
              "text-xs leading-5 whitespace-pre-wrap break-words text-muted-foreground",
              compact ? "line-clamp-2" : "line-clamp-3",
            )}
          >
            {notification.snapshot.excerpt}
          </p>
        ) : null}
        {unavailable ? (
          <p className="text-xs text-muted-foreground">
            {notification.target_status === "deleted"
              ? "この項目は削除されています"
              : "この項目へのアクセス権限がありません"}
          </p>
        ) : null}
      </div>
    </>
  );
  const style = cn(
    "flex min-w-0 gap-3 px-3 py-3 text-left",
    !notification.is_read && "bg-muted/40",
  );
  if (unavailable) {
    return (
      <div className={style}>
        {content}
        {!notification.is_read ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onMarkRead}
          >
            既読にする
          </Button>
        ) : null}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={cn(
        style,
        "w-full cursor-pointer hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60",
      )}
      disabled={pending}
      onClick={onOpen}
    >
      {content}
    </button>
  );
}

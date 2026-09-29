"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/feedback/empty-state";
import {
  notificationDateGroup,
  notificationHref,
} from "@/features/notifications/lib/notification-display";
import { useNotificationMutations } from "@/features/notifications/hooks/use-notifications";
import type { NotificationRead } from "@/lib/api/generated/model";

import { NotificationItem } from "./notification-item";

export function NotificationList({
  items,
  compact = false,
  groupByDate = false,
  onNavigate,
  onRead,
}: {
  items: NotificationRead[];
  compact?: boolean;
  groupByDate?: boolean;
  onNavigate?: () => void;
  onRead?: () => void;
}) {
  const router = useRouter();
  const { markRead } = useNotificationMutations();
  const open = async (notification: NotificationRead, navigate: boolean) => {
    try {
      if (!notification.is_read) {
        await markRead.mutateAsync(notification.id);
        onRead?.();
      }
      const href = navigate ? notificationHref(notification) : null;
      if (href) {
        onNavigate?.();
        router.push(href);
      }
    } catch {
      toast.error("通知を既読にできませんでした。もう一度お試しください。");
    }
  };
  if (!items.length)
    return <EmptyState message="通知はありません" className="px-3 py-6" />;
  const groups = new Map<string, NotificationRead[]>();
  for (const item of items) {
    const label = groupByDate ? notificationDateGroup(item.created_at) : "";
    const group = groups.get(label) ?? [];
    group.push(item);
    groups.set(label, group);
  }
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-label="通知一覧">
      {[...groups].map(([label, group]) => (
        <section key={label} aria-label={label || "最近の通知"}>
          {label ? (
            <h2 className="px-3 pb-2 text-sm font-medium text-muted-foreground">
              {label}
            </h2>
          ) : null}
          <ul className="divide-y divide-border">
            {group.map((notification) => (
              <li key={notification.id}>
                <NotificationItem
                  notification={notification}
                  compact={compact}
                  pending={markRead.isPending}
                  onOpen={() => void open(notification, true)}
                  onMarkRead={() => void open(notification, false)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

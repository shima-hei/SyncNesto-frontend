"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Folders, Inbox, MessagesSquare } from "lucide-react";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFreshShared } from "@/features/artifact-publications/hooks/use-fresh-shared";
import {
  listGuestActivitySharedActivityGet as listActivity,
  markGuestActivityReadSharedActivityNoticeIdReadPost as markRead,
} from "@/lib/api/generated/shared-activity/shared-activity";
import type { GuestActivityRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

export const GUEST_ACTIVITY_CHANGED = "syncnesto:guest-activity-changed";

const noticeKind = {
  publication_shared: { label: "資料が共有されました", icon: Folders },
  shared_comment_reply: {
    label: "コメントに返信が届きました",
    icon: MessagesSquare,
  },
  shared_comment_mention: {
    label: "共有コメントでメンションされました",
    icon: MessagesSquare,
  },
  requirement_review_requested: {
    label: "認識合わせの依頼が届きました",
    icon: Inbox,
  },
  requirement_approval_requested: {
    label: "正式承認の依頼が届きました",
    icon: Inbox,
  },
} satisfies Record<
  GuestActivityRead["kind"],
  { label: string; icon: typeof Inbox }
>;

export function GuestActivity({
  unreadComments = false,
}: {
  unreadComments?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const root = useRef<HTMLElement>(null);
  const router = useRouter();
  const pageSize = unreadComments ? 4 : 15;
  const sectionTitle = unreadComments
    ? "自分宛ての未読コメント"
    : "資料・コメント・依頼";
  const load = useCallback(
    (signal: AbortSignal) =>
      listActivity(
        {
          page,
          unread_only: unreadComments || unreadOnly,
          comments_only: unreadComments || undefined,
          page_size: pageSize,
        },
        { signal },
      ),
    [page, pageSize, unreadOnly, unreadComments],
  );
  const mask = useCallback((hidden: boolean) => {
    if (root.current) root.current.hidden = hidden;
  }, []);
  const {
    value,
    refresh,
    error: queryError,
    operationSignal,
  } = useFreshShared(
    JSON.stringify([page, unreadOnly, unreadComments]),
    load,
    mask,
  );
  useEffect(() => {
    if (!value?.items.length) return;
    const expires = Math.min(
      ...value.items.map((item) => Date.parse(item.expires_at)),
    );
    const timer = window.setTimeout(
      () => void refresh(),
      Math.max(0, Math.min(expires - Date.now(), 2_147_483_647)),
    );
    return () => window.clearTimeout(timer);
  }, [value, refresh]);
  async function open(item: GuestActivityRead) {
    if (busy || !operationSignal || operationSignal.aborted) return;
    setBusy(true);
    setError(false);
    try {
      const current = await markRead(item.id, { signal: operationSignal });
      if (operationSignal.aborted) return;
      window.dispatchEvent(new Event(GUEST_ACTIVITY_CHANGED));
      const publication = `/shared/publications/${current.publication_id}`;
      const href =
        current.kind === "requirement_review_requested"
          ? `${publication}/requirement-reviews/${current.id}`
          : current.kind === "requirement_approval_requested"
            ? `${publication}/requirement-approvals/${current.id}`
            : current.thread_id
              ? `${publication}?thread=${current.thread_id}#shared-comments`
              : publication;
      router.push(href);
    } catch {
      if (!operationSignal.aborted) setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      ref={root}
      className="grid min-w-0 gap-3 border-t pt-4"
      aria-label={unreadComments ? sectionTitle : "資料、コメント、依頼の通知"}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">
          {sectionTitle}
          {unreadComments && Boolean(value?.unread) && (
            <Badge className="ms-2" variant="secondary">
              {value?.unread} 件
            </Badge>
          )}
        </h2>
        {unreadComments ? (
          <Button asChild size="sm" variant="ghost">
            <Link href="/shared/notifications" prefetch={false}>
              すべての通知
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-pressed={unreadOnly}
            onClick={() => {
              setPage(1);
              setUnreadOnly(!unreadOnly);
            }}
          >
            未読のみ
          </Button>
        )}
      </div>
      <div className="grid min-w-0 gap-3">
        {error || queryError ? (
          <DataLoadError
            resourceName={sectionTitle}
            onRetry={() => {
              setError(false);
              void refresh();
            }}
          />
        ) : !value ? (
          <Skeleton className="h-16" />
        ) : !value.items.length ? (
          <EmptyState
            message={
              unreadComments
                ? "未読の返信やメンションはありません。"
                : "表示できる通知はありません。"
            }
          />
        ) : (
          <>
            <ul className="divide-y border-y">
              {value.items.map((item) => {
                const { icon: Icon, label } = noticeKind[item.kind];
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void open(item)}
                      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-sm p-3 text-left hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <Icon className="size-4" aria-hidden />
                      <span className="grid min-w-0 gap-1">
                        <span className="text-sm font-medium break-words">
                          {item.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {label}
                          {" · "}
                          {formatDateTime(item.created_at)}
                        </span>
                      </span>
                      {!item.read_at && <Badge variant="secondary">未読</Badge>}
                    </button>
                  </li>
                );
              })}
            </ul>
            {!unreadComments && value.total > pageSize && (
              <DataPagination
                page={page}
                pageSize={pageSize}
                currentCount={value.items.length}
                total={value.total}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}

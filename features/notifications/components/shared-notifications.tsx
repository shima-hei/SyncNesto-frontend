"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellIcon } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { PageHeader } from "@/components/shared/layout/page-header";
import { useFreshShared } from "@/features/artifact-publications/hooks/use-fresh-shared";
import { ApprovalMfa } from "@/features/guest-fixed-approvals/components/approval-mfa";
import {
  sharedApprovalPath,
  approvalKindLabels,
} from "@/features/guest-fixed-approvals/lib/display";
import { statusLabels } from "@/features/fixed-approvals/lib/display";
import { ApiError } from "@/lib/api/error";
import { formatDateTime, formatRelativeDate } from "@/lib/format/date";
import type { SharedNotificationRead } from "@/lib/api/generated/model";
import {
  listSharedNotificationsSharedNotificationsGet as list,
  sharedNotificationUnreadCountSharedNotificationsUnreadCountGet as unread,
  markSharedNotificationsReadSharedNotificationsReadAllPost as readAll,
  markSharedNotificationReadSharedNotificationsEventIdReadPost as readOne,
} from "@/lib/api/generated/shared-notifications/shared-notifications";

const CHANGED = "syncnesto:shared-notifications-changed";

export function SharedNotificationsLink() {
  const root = useRef<HTMLSpanElement>(null);
  const mask = useCallback((hidden: boolean) => {
    if (root.current) root.current.style.visibility = hidden ? "hidden" : "";
  }, []);
  const load = useCallback((signal: AbortSignal) => unread({ signal }), []);
  const data = useFreshShared("shared-notification-count", load, mask);
  const { refresh } = data;
  useEffect(() => {
    const update = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(update, 45_000);
    window.addEventListener(CHANGED, update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(CHANGED, update);
    };
  }, [refresh]);
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href="/shared/notifications" prefetch={false}>
        <BellIcon data-icon="inline-start" />
        通知
        <span ref={root}>
          {data.value?.count ? (
            <Badge variant="secondary">未読 {data.value.count}</Badge>
          ) : null}
        </span>
      </Link>
    </Button>
  );
}

export function SharedNotificationsPage() {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [operationError, setOperationError] = useState<unknown>(null);
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const lock = useRef(false);
  const mask = useCallback((hidden: boolean) => {
    if (root.current) root.current.style.visibility = hidden ? "hidden" : "";
  }, []);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [inbox, count] = await Promise.all([
        list({ page, page_size: 20, unread_only: unreadOnly }, { signal }),
        unread({ signal }),
      ]);
      return { inbox, count: count.count };
    },
    [page, unreadOnly],
  );
  const data = useFreshShared(
    `shared-notifications:${page}:${unreadOnly}`,
    load,
    mask,
  );
  const { refresh, value } = data;
  useEffect(() => {
    if (!value?.inbox.items.length) return;
    const deadline = Math.min(
      ...value.inbox.items.map((item) => Date.parse(item.expires_at)),
    );
    const timer = window.setTimeout(
      () => void refresh(),
      Math.max(0, Math.min(deadline - Date.now(), 2_147_483_647)),
    );
    return () => window.clearTimeout(timer);
  }, [value, refresh]);
  const act = async (notice?: SharedNotificationRead) => {
    if (lock.current || !data.operationSignal || data.operationSignal.aborted)
      return;
    lock.current = true;
    setBusy(true);
    setOperationError(null);
    const signal = data.operationSignal;
    try {
      if (notice) {
        const current = await readOne(notice.id, { signal });
        if (signal.aborted) return;
        window.dispatchEvent(new Event(CHANGED));
        router.push(
          sharedApprovalPath(current.publication_id, current.approval_id),
        );
      } else {
        await readAll({ signal });
        if (signal.aborted) return;
        window.dispatchEvent(new Event(CHANGED));
        await refresh();
      }
    } catch (error) {
      if (!signal.aborted) {
        setOperationError(error);
        await refresh();
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const error = data.error || operationError;
  return (
    <div className="flex min-w-0 flex-col gap-5" ref={root}>
      <PageHeader
        title="あなたへの通知"
        description="許可された固定内容への依頼です。通知の既読と合意・承認は別の操作です。"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/shared/publications" prefetch={false}>
              共有内容へ戻る
            </Link>
          </Button>
        }
      />
      {data.error instanceof ApiError && data.error.code === "MFA_REQUIRED" ? (
        <ApprovalMfa returnTo="/shared/notifications" />
      ) : error ? (
        <Alert>
          <AlertTitle>現在の通知を確認してください</AlertTitle>
          <AlertDescription>
            <p>
              公開状態・期限・ログイン中の本人、接続状況を確認して再読み込みしてください。
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOperationError(null);
                void refresh();
              }}
            >
              再読み込み
            </Button>
          </AlertDescription>
        </Alert>
      ) : !value ? (
        <Skeleton className="h-32 w-full" aria-label="通知と閲覧許可を確認中" />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">未読 {value.count}件</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                aria-pressed={unreadOnly}
                onClick={() => {
                  setUnreadOnly(!unreadOnly);
                  setPage(1);
                }}
              >
                未読のみ{unreadOnly ? "：オン" : "：オフ"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy || !value.count}
                onClick={() => void act()}
              >
                すべて既読
              </Button>
            </div>
          </div>
          {!value.inbox.items.length ? (
            <EmptyState message="現在確認できる通知はありません" />
          ) : (
            <ul
              className="flex flex-col divide-y rounded-md border"
              aria-label="あなたへの通知一覧"
            >
              {value.inbox.items.map((notice) => (
                <li key={notice.id}>
                  <button
                    type="button"
                    className="flex w-full min-w-0 flex-col gap-2 p-4 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
                    disabled={busy}
                    onClick={() => void act(notice)}
                  >
                    <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={notice.is_read ? "outline" : "secondary"}>
                        {notice.is_read ? "既読" : "未読"}
                      </Badge>
                      <span>{approvalKindLabels[notice.target_kind]}</span>
                      <time
                        dateTime={notice.created_at}
                        title={formatDateTime(notice.created_at)}
                      >
                        {formatRelativeDate(notice.created_at)}
                      </time>
                    </span>
                    <span className="text-sm font-medium break-words">
                      {notice.action === "cancelled"
                        ? "依頼元が取り消しました"
                        : `${notice.requester_name}からの判断依頼`}
                    </span>
                    <span className="text-sm break-words">{notice.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {notice.can_decide
                        ? "固定内容・依頼の目的を確認して判断する"
                        : notice.current_status === "requested"
                          ? "判断停止中 · 内容と履歴を確認"
                          : `現在：${statusLabels[notice.current_status]} · 内容と履歴を確認`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <DataPagination
            page={page}
            pageSize={20}
            total={value.inbox.total}
            currentCount={value.inbox.items.length}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

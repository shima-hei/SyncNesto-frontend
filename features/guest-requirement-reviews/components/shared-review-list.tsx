"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronRightIcon,
  FileCheckIcon,
  MessageSquareIcon,
} from "lucide-react";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFreshShared } from "@/features/artifact-publications/hooks/use-fresh-shared";
import { ApprovalMfa } from "@/features/guest-fixed-approvals/components/approval-mfa";
import { reviewRequestStatus } from "@/features/requirements/lib/requirement-workflow-review";
import { ApiError } from "@/lib/api/error";
import { formatDate } from "@/lib/format/date";
import { listApprovals, listReviews } from "../lib/api";

const pageSize = 15;

export function SharedRequirementReviewList({
  publicationId,
  formal = false,
}: {
  publicationId?: string;
  formal?: boolean;
}) {
  const list = formal ? listApprovals : listReviews;
  const Icon = formal ? FileCheckIcon : MessageSquareIcon;
  const heading = formal ? "あなたへの正式承認依頼" : "あなたへのレビュー依頼";
  const [page, setPage] = useState(1);
  const root = useRef<HTMLDivElement>(null);
  const mask = useCallback((hidden: boolean) => {
    if (root.current) root.current.hidden = hidden;
  }, []);
  const load = useCallback(
    (signal: AbortSignal) =>
      list(
        { publication_id: publicationId, page, page_size: pageSize },
        { signal },
      ),
    [publicationId, page, list],
  );
  const { value, error, refresh } = useFreshShared(
    JSON.stringify([formal, publicationId, page]),
    load,
    mask,
  );
  useEffect(() => {
    if (!value?.items.length) return;
    const expiration = Math.min(
      ...value.items.map((item) => Date.parse(item.expires_at)),
    );
    const timer = window.setTimeout(
      () => void refresh(),
      Math.max(0, Math.min(expiration - Date.now(), 2_147_483_647)),
    );
    return () => window.clearTimeout(timer);
  }, [value, refresh]);

  return (
    <section aria-label={heading} className="grid min-w-0 gap-3">
      <h2 className="text-base font-semibold">{heading}</h2>
      <div ref={root}>
        {error instanceof ApiError && error.code === "MFA_REQUIRED" ? (
          <ApprovalMfa
            returnTo={
              publicationId
                ? `/shared/publications/${publicationId}`
                : "/shared/publications"
            }
          />
        ) : error ? (
          <DataLoadError
            resourceName={heading}
            onRetry={() => void refresh()}
          />
        ) : !value ? (
          <Skeleton className="h-14" />
        ) : value.items.length ? (
          <ul className="divide-y border-y">
            {value.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/shared/publications/${item.publication_id}/${formal ? "requirement-approvals" : "requirement-reviews"}/${item.id}`}
                  prefetch={false}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-sm py-3 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                  <span className="grid min-w-0 gap-1">
                    <span className="text-sm font-medium [overflow-wrap:anywhere]">
                      {item.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.version_label}
                      {item.due_on
                        ? ` ・ 回答期限 ${formatDate(item.due_on)}`
                        : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline">
                      {item.status === "requested"
                        ? item.responded
                          ? formal
                            ? "回答済み"
                            : "提出済み"
                          : formal
                            ? "承認待ち"
                            : "確認待ち"
                        : reviewRequestStatus[item.status]}
                    </Badge>
                    <ChevronRightIcon
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {formal
              ? "現在表示できる正式承認依頼はありません。"
              : "現在表示できるレビュー依頼はありません。"}
          </p>
        )}
        {value && (value.total > pageSize || page > 1) ? (
          <div className="mt-3">
            <DataPagination
              page={page}
              pageSize={pageSize}
              total={value.total}
              currentCount={value.items.length}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

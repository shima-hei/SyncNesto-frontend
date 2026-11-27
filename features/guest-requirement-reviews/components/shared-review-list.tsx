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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFreshShared } from "@/features/artifact-publications/hooks/use-fresh-shared";
import { reviewRequestStatus } from "@/features/requirements/lib/requirement-workflow-review";
import { ApiError } from "@/lib/api/error";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { listApprovals, listReviews } from "../lib/api";

const pageSize = 15;

export function SharedRequirementReviewList({
  publicationId,
  participationId,
  compact = false,
  formal = false,
  onMfaRequired,
}: {
  publicationId?: string;
  participationId?: string;
  compact?: boolean;
  formal?: boolean;
  onMfaRequired: (required: boolean) => void;
}) {
  const list = formal ? listApprovals : listReviews;
  const Icon = formal ? FileCheckIcon : MessageSquareIcon;
  const heading = formal
    ? "あなたへの正式承認依頼"
    : "あなたへの認識合わせ依頼";
  const [page, setPage] = useState(1);
  const [view, setView] = useState("all");
  const root = useRef<HTMLDivElement>(null);
  const mask = useCallback((hidden: boolean) => {
    if (root.current) root.current.hidden = hidden;
  }, []);
  const load = useCallback(
    (signal: AbortSignal) =>
      list(
        {
          publication_id: publicationId,
          participation_id: participationId,
          responded: compact
            ? false
            : view === "all"
              ? undefined
              : view === "responded",
          page,
          page_size: pageSize,
        },
        { signal },
      ),
    [publicationId, participationId, view, page, list, compact],
  );
  const { value, error, refresh } = useFreshShared(
    JSON.stringify([formal, publicationId, participationId, view, page]),
    load,
    mask,
  );
  const needsMfa = error instanceof ApiError && error.code === "MFA_REQUIRED";
  useEffect(() => {
    if (value || error) onMfaRequired(needsMfa);
  }, [error, needsMfa, onMfaRequired, value]);
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

  if (needsMfa) return null;
  return (
    <section aria-label={heading} className="grid min-w-0 gap-3">
      <h2 className="text-base font-semibold">{heading}</h2>
      {!publicationId && !compact && (
        <ToggleGroup
          type="single"
          className="justify-self-start"
          aria-label={heading + "の表示"}
          value={view}
          onValueChange={(next) => {
            if (next) {
              setPage(1);
              setView(next);
            }
          }}
        >
          <ToggleGroupItem value="all">すべて</ToggleGroupItem>
          <ToggleGroupItem value="pending">要対応</ToggleGroupItem>
          <ToggleGroupItem value="responded">回答済み</ToggleGroupItem>
        </ToggleGroup>
      )}
      <div ref={root}>
        {error ? (
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
                      {!publicationId && !participationId
                        ? `${item.public_project_name || "公開名未設定"} ・ `
                        : ""}
                      {item.version_label}
                      {item.captured_at
                        ? ` ・ 固定日時 ${formatDateTime(item.captured_at)}`
                        : ""}
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

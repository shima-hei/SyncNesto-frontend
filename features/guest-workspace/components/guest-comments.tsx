"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CommentMessage } from "@/components/shared/comments/comment-message";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useFreshShared } from "@/features/artifact-publications/hooks/use-fresh-shared";
import { SharedCommentBody } from "@/features/artifact-publications/components/shared-comment-body";
import { loadSharedLinkTitles } from "@/features/artifact-publications/lib/shared-comment-links";
import { publicationQuoteId } from "@/features/artifact-publications/lib/publication-quote";
import { listGuestCommentsSharedCommentsGet as listComments } from "@/lib/api/generated/shared-comments/shared-comments";

export function GuestComments({
  participationId,
  preview,
}: {
  participationId?: string;
  preview?: boolean;
}) {
  const [page, setPage] = useState(1);
  const root = useRef<HTMLDivElement>(null);
  const pageSize = preview ? 4 : 20;
  const load = useCallback(
    async (signal: AbortSignal) => {
      const comments = await listComments(
        { page, page_size: pageSize, participation_id: participationId },
        { signal },
      );
      return {
        ...comments,
        titles: await loadSharedLinkTitles(comments.items, signal),
      };
    },
    [page, pageSize, participationId],
  );
  const mask = useCallback((hidden: boolean) => {
    if (root.current) root.current.hidden = hidden;
  }, []);
  const { value, refresh, error } = useFreshShared(
    JSON.stringify([page, pageSize, participationId]),
    load,
    mask,
  );
  useEffect(() => {
    if (!value?.items.length) return;
    const expires = Math.min(
      ...value.items.map((item) => Date.parse(item.expires_at)),
      ...value.titles.map((item) => Date.parse(item.expires_at)),
    );
    const timer = window.setTimeout(
      () => void refresh(),
      Math.max(0, Math.min(expires - Date.now(), 2_147_483_647)),
    );
    return () => window.clearTimeout(timer);
  }, [value, refresh]);
  return (
    <div ref={root} className="grid min-w-0 gap-3">
      {error ? (
        <DataLoadError resourceName="コメント" onRetry={() => void refresh()} />
      ) : !value ? (
        <Skeleton className="h-20" />
      ) : value.items.length ? (
        <>
          <ul className="grid gap-3 divide-y">
            {value.items.map((item) => {
              const target = item.node_id
                ? item.anchor
                  ? publicationQuoteId(item.node_id, item.anchor.field)
                  : `public-node-${item.node_id}`
                : "shared-comments";
              return (
                <li key={item.id} className="grid gap-2 pb-3">
                  <Link
                    prefetch={false}
                    href={`/shared/publications/${item.publication_id}?thread=${item.id}#${target}`}
                    className="text-sm font-medium break-words underline-offset-4 hover:underline"
                  >
                    {item.anchor && (
                      <blockquote className="border-s-2 ps-3 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
                        {item.anchor.quote}
                      </blockquote>
                    )}
                    {item.publication_title}
                  </Link>
                  <CommentMessage
                    author={item.author_label}
                    createdAt={item.created_at}
                  >
                    <SharedCommentBody
                      body={item.body}
                      mentions={item.mentions}
                      titles={value.titles}
                    />
                    {Boolean(item.attachments?.length) && (
                      <p className="text-xs text-muted-foreground">
                        添付 {item.attachments?.length} 件
                      </p>
                    )}
                  </CommentMessage>
                </li>
              );
            })}
          </ul>
          {!preview && value.total > pageSize && (
            <DataPagination
              page={page}
              pageSize={pageSize}
              currentCount={value.items.length}
              onPageChange={setPage}
              total={value.total}
            />
          )}
        </>
      ) : (
        <EmptyState message="共有コメントはありません" />
      )}
    </div>
  );
}

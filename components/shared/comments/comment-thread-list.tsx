"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/shared/feedback/empty-state";
import { LoadingState } from "@/components/shared/feedback/loading-state";

type CommentThreadListProps<TComment> = {
  comments: TComment[];
  isLoading: boolean;
  canComment: boolean;
  emptyMessage: string;
  getCommentId: (comment: TComment) => number;
  getParentCommentId: (comment: TComment) => number | null | undefined;
  renderCommentBody: (props: CommentBodyRenderProps<TComment>) => ReactNode;
  renderEditForm: (props: CommentFormRenderProps<TComment>) => ReactNode;
  renderReplyForm: (props: CommentFormRenderProps<TComment>) => ReactNode;
  canEditComment?: (comment: TComment) => boolean;
  canReplyComment?: (comment: TComment) => boolean;
  loadingFallback?: ReactNode;
};

type CommentBodyRenderProps<TComment> = {
  comment: TComment;
  onEdit: (comment: TComment) => void;
  onReply: (comment: TComment) => void;
};

type CommentFormRenderProps<TComment> = {
  comment: TComment;
  onClose: () => void;
};

export function CommentThreadList<TComment>({
  comments,
  isLoading,
  canComment,
  emptyMessage,
  getCommentId,
  getParentCommentId,
  renderCommentBody,
  renderEditForm,
  renderReplyForm,
  canEditComment,
  canReplyComment,
  loadingFallback,
}: CommentThreadListProps<TComment>) {
  const [editingTarget, setEditingTarget] = useState<TComment | null>(null);
  const [replyTarget, setReplyTarget] = useState<TComment | null>(null);
  const byParent = new Map<number | null, TComment[]>();
  const ids = new Set(comments.map(getCommentId));
  for (const comment of comments) {
    const parent = getParentCommentId(comment);
    const parentId = parent != null && ids.has(parent) ? parent : null;
    const siblings = byParent.get(parentId) ?? [];
    siblings.push(comment);
    byParent.set(parentId, siblings);
  }
  const roots = byParent.get(null) ?? [];

  if (isLoading) return loadingFallback ?? <LoadingState />;
  if (!roots.length) return <EmptyState message={emptyMessage} />;

  const renderItem = (comment: TComment, replies?: ReactNode): ReactNode => {
    const id = getCommentId(comment);
    return (
      <li key={id} className="flex min-w-0 flex-col gap-2 py-2.5">
        {renderCommentBody({
          comment,
          onEdit: setEditingTarget,
          onReply: setReplyTarget,
        })}
        {canComment &&
        editingTarget &&
        getCommentId(editingTarget) === id &&
        (canEditComment?.(comment) ?? true) ? (
          <div className="ms-8 min-w-0">
            {renderEditForm({ comment, onClose: () => setEditingTarget(null) })}
          </div>
        ) : null}
        {canComment &&
        replyTarget &&
        getCommentId(replyTarget) === id &&
        (canReplyComment?.(comment) ?? true) ? (
          <div className="ms-8 min-w-0">
            {renderReplyForm({ comment, onClose: () => setReplyTarget(null) })}
          </div>
        ) : null}
        {replies}
      </li>
    );
  };

  return (
    <ul role="list" className="min-w-0 divide-y divide-border/60">
      {roots.map((root) => {
        const replies = [...(byParent.get(getCommentId(root)) ?? [])];
        for (let index = 0; index < replies.length; index++) {
          replies.push(...(byParent.get(getCommentId(replies[index])) ?? []));
        }
        return renderItem(
          root,
          replies.length ? (
            <ul
              role="list"
              aria-label={`${replies.length}件の返信`}
              className="mb-2 ms-4 min-w-0 border-s border-border/60 ps-2"
            >
              {replies.map((reply) => renderItem(reply))}
            </ul>
          ) : null,
        );
      })}
    </ul>
  );
}

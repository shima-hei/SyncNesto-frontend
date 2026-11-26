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

  const renderItem = (comment: TComment): ReactNode => {
    const id = getCommentId(comment);
    const replies = byParent.get(id);
    return (
      <li key={id} className="flex min-w-0 flex-col gap-3 py-2">
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
        {replies?.length ? (
          <ul role="list" className="ms-2 min-w-0 border-s ps-3 sm:ms-4">
            {replies.map(renderItem)}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <ul role="list" className="min-w-0 divide-y">
      {roots.map(renderItem)}
    </ul>
  );
}

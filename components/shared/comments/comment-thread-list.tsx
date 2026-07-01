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
  const rootComments = comments.filter((comment) => !getParentCommentId(comment));

  if (isLoading) {
    return loadingFallback ?? <LoadingState />;
  }

  if (!rootComments.length) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {rootComments.map((comment) => {
        const commentId = getCommentId(comment);
        const replies = comments.filter(
          (reply) => getParentCommentId(reply) === commentId
        );
        const isEditing =
          editingTarget ? getCommentId(editingTarget) === commentId : false;
        const isReplying =
          replyTarget ? getCommentId(replyTarget) === commentId : false;

        return (
          <div key={commentId} className="rounded-lg border p-3">
            {renderCommentBody({
              comment,
              onEdit: setEditingTarget,
              onReply: setReplyTarget,
            })}

            {canComment && isEditing && (canEditComment?.(comment) ?? true) ? (
              <div className="mt-3 rounded-lg bg-muted p-3">
                {renderEditForm({
                  comment,
                  onClose: () => setEditingTarget(null),
                })}
              </div>
            ) : null}

            {canComment && isReplying && (canReplyComment?.(comment) ?? true) ? (
              <div className="mt-3 rounded-lg bg-muted p-3">
                {renderReplyForm({
                  comment,
                  onClose: () => setReplyTarget(null),
                })}
              </div>
            ) : null}

            {replies.length ? (
              <div className="mt-3 flex flex-col gap-2 border-l pl-3">
                {replies.map((reply) => (
                  <div key={getCommentId(reply)}>
                    {renderCommentBody({
                      comment: reply,
                      onEdit: setEditingTarget,
                      onReply: setReplyTarget,
                    })}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

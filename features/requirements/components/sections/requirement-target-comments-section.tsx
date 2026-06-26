"use client";

import { useState } from "react";

import { CommentInlineHeader } from "@/components/shared/comments/comment-inline-header";
import { CommentThreadList } from "@/components/shared/comments/comment-thread-list";
import { CommentThreadActions } from "@/components/shared/comments/comment-thread-actions";
import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RequirementTargetCommentRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";
import { cn } from "@/lib/utils";

import { useCreateTargetComment } from "../../hooks/use-create-target-comment";
import { useDeleteTargetComment } from "../../hooks/use-delete-target-comment";
import { useTargetComments } from "../../hooks/use-target-comments";
import { useToggleTargetCommentState } from "../../hooks/use-toggle-target-comment-state";
import { useUpdateTargetComment } from "../../hooks/use-update-target-comment";
import { RequirementTargetCommentForm } from "../forms/requirement-target-comment-form";
import { RequirementSectionSkeleton } from "../shared/requirement-section-skeleton";

type RequirementTargetCommentsSectionProps = {
  projectId: number;
  targetType: string;
  targetId: number;
  title?: string;
  canComment: boolean;
  className?: string;
  contentClassName?: string;
};

export function RequirementTargetCommentsSection({
  projectId,
  targetType,
  targetId,
  title = "スレッドコメント",
  canComment,
  className,
  contentClassName,
}: RequirementTargetCommentsSectionProps) {
  const [deleteTarget, setDeleteTarget] =
    useState<RequirementTargetCommentRead | null>(null);
  const { comments, isLoading } = useTargetComments(
    projectId,
    targetType,
    targetId
  );
  const {
    createTargetComment,
    isPending: isCreatePending,
    error: createError,
  } = useCreateTargetComment(projectId, targetType, targetId);
  const {
    updateTargetComment,
    isPending: isUpdatePending,
    error: updateError,
  } = useUpdateTargetComment(projectId, targetType, targetId);
  const { deleteTargetComment, isPending: isDeletePending } =
    useDeleteTargetComment(projectId, targetType, targetId);
  const {
    resolveTargetComment,
    reopenTargetComment,
    isPending: isStatePending,
  } = useToggleTargetCommentState(projectId, targetType, targetId);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className={cn("flex flex-col gap-4", contentClassName)}>
        {canComment ? (
          <RequirementTargetCommentForm
            isPending={isCreatePending}
            error={createError}
            onSubmit={(values) => createTargetComment(values)}
          />
        ) : null}

        <CommentThreadList
          comments={comments}
          isLoading={isLoading}
          canComment={canComment}
          emptyMessage="スレッドコメントはありません。"
          getCommentId={(comment) => comment.id}
          getParentCommentId={(comment) => comment.parent_comment_id}
          loadingFallback={<RequirementSectionSkeleton />}
          renderCommentBody={({ comment, onEdit, onReply }) => (
            <CommentBody
              comment={comment}
              canComment={canComment}
              isStatePending={isStatePending}
              onEdit={onEdit}
              onReply={onReply}
              onDelete={setDeleteTarget}
              onResolve={resolveTargetComment}
              onReopen={reopenTargetComment}
            />
          )}
          renderEditForm={({ comment, onClose }) => (
            <>
              <CommentInlineHeader label="コメント編集" onClose={onClose} />
              <RequirementTargetCommentForm
                initialValues={{ body: comment.body, reason: "" }}
                submitLabel="コメント更新"
                resetOnSuccess={false}
                showReason
                isPending={isUpdatePending}
                error={updateError}
                onSubmit={(values) =>
                  updateTargetComment(comment.id, comment.version, values)
                }
                onSuccess={onClose}
              />
            </>
          )}
          renderReplyForm={({ comment, onClose }) => (
            <>
              <CommentInlineHeader label="返信" onClose={onClose} />
              <RequirementTargetCommentForm
                submitLabel="返信追加"
                isPending={isCreatePending}
                error={createError}
                onSubmit={(values) => createTargetComment(values, comment.id)}
                onSuccess={onClose}
              />
            </>
          )}
        />

        <ResourceDeleteDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          resourceName="コメント"
          description="コメントを削除します。返信がある場合は表示に影響する可能性があります。"
          isPending={isDeletePending}
          onConfirm={async () => {
            if (!deleteTarget) {
              return;
            }

            await deleteTargetComment(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      </CardContent>
    </Card>
  );
}

type CommentBodyProps = {
  comment: RequirementTargetCommentRead;
  canComment: boolean;
  isStatePending: boolean;
  onEdit: (comment: RequirementTargetCommentRead) => void;
  onReply: (comment: RequirementTargetCommentRead) => void;
  onDelete: (comment: RequirementTargetCommentRead) => void;
  onResolve: (commentId: number, version: number) => Promise<void>;
  onReopen: (commentId: number, version: number) => Promise<void>;
};

function CommentBody({
  comment,
  canComment,
  isStatePending,
  onEdit,
  onReply,
  onDelete,
  onResolve,
  onReopen,
}: CommentBodyProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs text-muted-foreground">
          {comment.author?.name ?? `投稿者ID: ${comment.author_id}`} /{" "}
          {formatDateTime(comment.created_at)} /{" "}
          {comment.is_resolved ? "解決済み" : "未解決"}
        </span>
        <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
      </div>
      {canComment ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          <CommentThreadActions
            comment={comment}
            isResolved={comment.is_resolved}
            isStatePending={isStatePending}
            resolvePlacement="first"
            reopenLabel="再開"
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            onResolve={() => onResolve(comment.id, comment.version)}
            onReopen={() => onReopen(comment.id, comment.version)}
          />
        </div>
      ) : null}
    </div>
  );
}

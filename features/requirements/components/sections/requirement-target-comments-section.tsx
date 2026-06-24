"use client";

import { useState } from "react";
import {
  CheckIcon,
  MessageSquareReplyIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
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
  const [editingTarget, setEditingTarget] =
    useState<RequirementTargetCommentRead | null>(null);
  const [replyTarget, setReplyTarget] =
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
  const rootComments = comments.filter((comment) => !comment.parent_comment_id);

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

        {isLoading ? (
          <RequirementSectionSkeleton />
        ) : rootComments.length ? (
          <div className="flex flex-col gap-3">
            {rootComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                replies={comments.filter(
                  (reply) => reply.parent_comment_id === comment.id
                )}
                canComment={canComment}
                isStatePending={isStatePending}
                editingTarget={editingTarget}
                replyTarget={replyTarget}
                updateError={updateError}
                isUpdatePending={isUpdatePending}
                createError={createError}
                isCreatePending={isCreatePending}
                onEdit={setEditingTarget}
                onReply={setReplyTarget}
                onDelete={setDeleteTarget}
                onResolve={resolveTargetComment}
                onReopen={reopenTargetComment}
                onUpdate={updateTargetComment}
                onCreateReply={createTargetComment}
                onCloseEdit={() => setEditingTarget(null)}
                onCloseReply={() => setReplyTarget(null)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            スレッドコメントはありません。
          </p>
        )}

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

type CommentItemProps = {
  comment: RequirementTargetCommentRead;
  replies: RequirementTargetCommentRead[];
  canComment: boolean;
  isStatePending: boolean;
  editingTarget: RequirementTargetCommentRead | null;
  replyTarget: RequirementTargetCommentRead | null;
  updateError?: Error | null;
  isUpdatePending: boolean;
  createError?: Error | null;
  isCreatePending: boolean;
  onEdit: (comment: RequirementTargetCommentRead | null) => void;
  onReply: (comment: RequirementTargetCommentRead | null) => void;
  onDelete: (comment: RequirementTargetCommentRead) => void;
  onResolve: (commentId: number, version: number) => Promise<void>;
  onReopen: (commentId: number, version: number) => Promise<void>;
  onUpdate: (
    commentId: number,
    version: number,
    values: { body: string; reason: string }
  ) => Promise<unknown>;
  onCreateReply: (
    values: { body: string; reason: string },
    parentCommentId?: number | null
  ) => Promise<unknown>;
  onCloseEdit: () => void;
  onCloseReply: () => void;
};

function CommentItem({
  comment,
  replies,
  canComment,
  isStatePending,
  editingTarget,
  replyTarget,
  updateError,
  isUpdatePending,
  createError,
  isCreatePending,
  onEdit,
  onReply,
  onDelete,
  onResolve,
  onReopen,
  onUpdate,
  onCreateReply,
  onCloseEdit,
  onCloseReply,
}: CommentItemProps) {
  const isEditing = editingTarget?.id === comment.id;
  const isReplying = replyTarget?.id === comment.id;

  return (
    <div className="rounded-lg border p-3">
      <CommentBody
        comment={comment}
        canComment={canComment}
        isStatePending={isStatePending}
        onEdit={onEdit}
        onReply={onReply}
        onDelete={onDelete}
        onResolve={onResolve}
        onReopen={onReopen}
      />

      {isEditing ? (
        <div className="mt-3 rounded-lg bg-muted p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium">コメント編集</span>
            <Button type="button" variant="outline" size="sm" onClick={onCloseEdit}>
              <XIcon data-icon="inline-start" />
              閉じる
            </Button>
          </div>
          <RequirementTargetCommentForm
            initialValues={{ body: comment.body, reason: "" }}
            submitLabel="コメント更新"
            resetOnSuccess={false}
            showReason
            isPending={isUpdatePending}
            error={updateError}
            onSubmit={(values) => onUpdate(comment.id, comment.version, values)}
            onSuccess={onCloseEdit}
          />
        </div>
      ) : null}

      {isReplying ? (
        <div className="mt-3 rounded-lg bg-muted p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium">返信</span>
            <Button type="button" variant="outline" size="sm" onClick={onCloseReply}>
              <XIcon data-icon="inline-start" />
              閉じる
            </Button>
          </div>
          <RequirementTargetCommentForm
            submitLabel="返信追加"
            isPending={isCreatePending}
            error={createError}
            onSubmit={(values) => onCreateReply(values, comment.id)}
            onSuccess={onCloseReply}
          />
        </div>
      ) : null}

      {replies.length ? (
        <div className="mt-3 flex flex-col gap-2 border-l pl-3">
          {replies.map((reply) => (
            <CommentBody
              key={reply.id}
              comment={reply}
              canComment={canComment}
              isStatePending={isStatePending}
              onEdit={onEdit}
              onReply={onReply}
              onDelete={onDelete}
              onResolve={onResolve}
              onReopen={onReopen}
            />
          ))}
        </div>
      ) : null}
    </div>
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
          投稿者ID: {comment.author_id} / {formatDateTime(comment.created_at)} /{" "}
          {comment.is_resolved ? "解決済み" : "未解決"}
        </span>
        <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
      </div>
      {canComment ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isStatePending}
            onClick={() =>
              comment.is_resolved
                ? onReopen(comment.id, comment.version)
                : onResolve(comment.id, comment.version)
            }
          >
            {comment.is_resolved ? (
              <RotateCcwIcon data-icon="inline-start" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            {comment.is_resolved ? "再開" : "解決"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onReply(comment)}
          >
            <MessageSquareReplyIcon data-icon="inline-start" />
            返信
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(comment)}
          >
            <PencilIcon data-icon="inline-start" />
            編集
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onDelete(comment)}
          >
            <Trash2Icon data-icon="inline-start" />
            削除
          </Button>
        </div>
      ) : null}
    </div>
  );
}

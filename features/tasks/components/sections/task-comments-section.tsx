"use client";

import { CommentContent } from "@/components/shared/comments/comment-content";
import { useState } from "react";

import { CommentInlineHeader } from "@/components/shared/comments/comment-inline-header";
import { CommentThreadList } from "@/components/shared/comments/comment-thread-list";
import { CommentThreadActions } from "@/components/shared/comments/comment-thread-actions";
import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskCommentRead, TaskRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";
import { cn } from "@/lib/utils";

import { useCreateTaskComment } from "../../hooks/use-create-task-comment";
import { useDeleteTaskComment } from "../../hooks/use-delete-task-comment";
import { useTaskComments } from "../../hooks/use-task-comments";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { useToggleTaskCommentState } from "../../hooks/use-toggle-task-comment-state";
import { useUpdateTaskStatus } from "../../hooks/use-update-task-status";
import { useUpdateTaskComment } from "../../hooks/use-update-task-comment";
import type { TaskCommentFormValues } from "../../types/task-comment-form";
import {
  TASK_COMMENT_STATUS_UNCHANGED,
  TaskCommentForm,
} from "../forms/task-comment-form";

type TaskCommentsSectionProps = {
  projectId: number;
  task: TaskRead;
  taskId: number;
  canComment: boolean;
  canUpdateStatus: boolean;
  className?: string;
  contentClassName?: string;
};

export function TaskCommentsSection({
  projectId,
  task,
  taskId,
  canComment,
  canUpdateStatus,
  className,
  contentClassName,
}: TaskCommentsSectionProps) {
  const [deleteTarget, setDeleteTarget] = useState<TaskCommentRead | null>(
    null,
  );
  const { comments, isLoading } = useTaskComments(taskId);
  const {
    createTaskComment,
    isPending: isCreatePending,
    error: createError,
  } = useCreateTaskComment(taskId);
  const {
    updateTaskComment,
    isPending: isUpdatePending,
    error: updateError,
  } = useUpdateTaskComment(taskId);
  const { deleteTaskComment, isPending: isDeletePending } =
    useDeleteTaskComment(taskId);
  const {
    resolveTaskComment,
    reopenTaskComment,
    isPending: isStatePending,
  } = useToggleTaskCommentState(taskId);
  const { updateTaskStatus, isPending: isStatusPending } =
    useUpdateTaskStatus(projectId);
  const { getTaskUserLabel } = useTaskUserMap(projectId);
  const handleCreateCommentWithStatus = async (
    values: TaskCommentFormValues,
  ) => {
    await createTaskComment(values);

    if (
      canUpdateStatus &&
      values.status !== TASK_COMMENT_STATUS_UNCHANGED &&
      values.status !== task.status
    ) {
      await updateTaskStatus(task, values.status);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>コメント</CardTitle>
      </CardHeader>
      <CardContent
        className={cn(
          "flex max-h-[640px] flex-col gap-4 overflow-y-auto",
          contentClassName,
        )}
      >
        {canComment ? (
          <TaskCommentForm
            projectId={projectId}
            key={task.status ?? TASK_COMMENT_STATUS_UNCHANGED}
            initialValues={{
              body: "",
              status: TASK_COMMENT_STATUS_UNCHANGED,
            }}
            enableStatusChange={canUpdateStatus}
            isPending={isCreatePending || isStatusPending}
            error={createError}
            onSubmit={handleCreateCommentWithStatus}
          />
        ) : null}

        <CommentThreadList
          comments={comments}
          isLoading={isLoading}
          canComment={canComment}
          emptyMessage="コメントはありません。"
          getCommentId={(comment) => comment.id}
          getParentCommentId={(comment) => comment.parent_comment_id}
          loadingFallback={
            <p className="text-sm text-muted-foreground">
              コメントを読み込み中です。
            </p>
          }
          renderCommentBody={({ comment, onEdit, onReply }) => (
            <TaskCommentBody
              comment={comment}
              canComment={canComment}
              isStatePending={isStatePending}
              getUserLabel={getTaskUserLabel}
              onEdit={onEdit}
              onReply={onReply}
              onDelete={setDeleteTarget}
              onResolve={resolveTaskComment}
              onReopen={reopenTaskComment}
            />
          )}
          renderEditForm={({ comment, onClose }) => (
            <>
              <CommentInlineHeader label="コメント編集" onClose={onClose} />
              <TaskCommentForm
                projectId={projectId}
                initialValues={{
                  body: comment.body,
                  mentions: comment.mentions,
                  status: TASK_COMMENT_STATUS_UNCHANGED,
                }}
                submitLabel="コメント更新"
                resetOnSuccess={false}
                isPending={isUpdatePending}
                error={updateError}
                onSubmit={(values) =>
                  updateTaskComment(comment.id, comment.version, values)
                }
                onSuccess={onClose}
              />
            </>
          )}
          renderReplyForm={({ comment, onClose }) => (
            <>
              <CommentInlineHeader label="返信" onClose={onClose} />
              <TaskCommentForm
                projectId={projectId}
                submitLabel="返信追加"
                isPending={isCreatePending}
                error={createError}
                onSubmit={(values) => createTaskComment(values, comment.id)}
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

            await deleteTaskComment(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      </CardContent>
    </Card>
  );
}

function TaskCommentBody({
  comment,
  canComment,
  isStatePending,
  getUserLabel,
  onEdit,
  onReply,
  onDelete,
  onResolve,
  onReopen,
}: {
  comment: TaskCommentRead;
  canComment: boolean;
  isStatePending: boolean;
  getUserLabel: (userId?: number | null) => string;
  onEdit: (comment: TaskCommentRead) => void;
  onReply: (comment: TaskCommentRead) => void;
  onDelete: (comment: TaskCommentRead) => void;
  onResolve: (commentId: number, version: number) => Promise<void>;
  onReopen: (commentId: number, version: number) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {comment.created_by_user?.name ?? getUserLabel(comment.created_by)} /{" "}
          {formatDateTime(comment.created_at)}
        </span>
        {comment.is_resolved ? (
          <span className="text-xs text-muted-foreground">解決済み</span>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap text-sm">
        <CommentContent body={comment.body} mentions={comment.mentions} />
      </p>
      {canComment ? (
        <CommentThreadActions
          comment={comment}
          isResolved={comment.is_resolved}
          isStatePending={isStatePending}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onResolve={() => onResolve(comment.id, comment.version)}
          onReopen={() => onReopen(comment.id, comment.version)}
        />
      ) : null}
    </div>
  );
}

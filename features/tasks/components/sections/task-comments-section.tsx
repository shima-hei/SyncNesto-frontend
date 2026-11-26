"use client";

import { CommentContent } from "@/components/shared/comments/comment-content";
import { useState } from "react";

import { CommentInlineHeader } from "@/components/shared/comments/comment-inline-header";
import { CommentThreadList } from "@/components/shared/comments/comment-thread-list";
import {
  CommentMessageMenu,
  CommentThreadActions,
} from "@/components/shared/comments/comment-thread-actions";
import { CommentMessage } from "@/components/shared/comments/comment-message";
import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskCommentRead, TaskRead } from "@/lib/api/generated/model";
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
  embedded?: boolean;
};

export function TaskCommentsSection({
  projectId,
  task,
  taskId,
  canComment,
  canUpdateStatus,
  className,
  contentClassName,
  embedded = false,
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
      await updateTaskStatus(task, values.status, {
        changeReason: values.body,
      }).catch(() => undefined);
    }
  };

  const Container = embedded ? "div" : Card;
  const Content = embedded ? "div" : CardContent;
  return (
    <Container className={className}>
      {!embedded && (
        <CardHeader>
          <CardTitle>コメント</CardTitle>
        </CardHeader>
      )}
      <Content
        className={cn(
          "flex flex-col gap-4",
          !embedded && "max-h-[640px] overflow-y-auto",
          contentClassName,
        )}
      >
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
      </Content>
    </Container>
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
    <CommentMessage
      images={comment.images}
      author={comment.created_by_user?.name ?? getUserLabel(comment.created_by)}
      avatarUrl={comment.created_by_user?.avatar_url}
      createdAt={comment.created_at}
      reply={Boolean(comment.parent_comment_id)}
      resolved={comment.is_resolved}
      menu={
        canComment ? (
          <CommentMessageMenu
            onEdit={() => onEdit(comment)}
            onDelete={() => onDelete(comment)}
          />
        ) : null
      }
    >
      <p className="whitespace-pre-wrap break-words text-sm">
        <CommentContent body={comment.body} mentions={comment.mentions} />
      </p>
      {canComment ? (
        <CommentThreadActions
          comment={comment}
          isResolved={comment.is_resolved}
          isStatePending={isStatePending}
          onReply={onReply}
          onResolve={() => onResolve(comment.id, comment.version)}
          onReopen={() => onReopen(comment.id, comment.version)}
        />
      ) : null}
    </CommentMessage>
  );
}

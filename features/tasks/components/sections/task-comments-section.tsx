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
import type { TaskCommentRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

import { useCreateTaskComment } from "../../hooks/use-create-task-comment";
import { useDeleteTaskComment } from "../../hooks/use-delete-task-comment";
import { useTaskComments } from "../../hooks/use-task-comments";
import { useToggleTaskCommentState } from "../../hooks/use-toggle-task-comment-state";
import { useUpdateTaskComment } from "../../hooks/use-update-task-comment";
import type { TaskCommentFormValues } from "../../types/task-comment-form";
import { TaskCommentForm } from "../forms/task-comment-form";

type TaskCommentsSectionProps = {
  taskId: number;
  canComment: boolean;
};

export function TaskCommentsSection({
  taskId,
  canComment,
}: TaskCommentsSectionProps) {
  const [deleteTarget, setDeleteTarget] = useState<TaskCommentRead | null>(null);
  const [editingTarget, setEditingTarget] = useState<TaskCommentRead | null>(null);
  const [replyTarget, setReplyTarget] = useState<TaskCommentRead | null>(null);
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
  const { resolveTaskComment, reopenTaskComment, isPending: isStatePending } =
    useToggleTaskCommentState(taskId);
  const rootComments = comments.filter((comment) => !comment.parent_comment_id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>コメント</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canComment ? (
          <TaskCommentForm
            isPending={isCreatePending}
            error={createError}
            onSubmit={(values) => createTaskComment(values)}
          />
        ) : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">コメントを読み込み中です。</p>
        ) : rootComments.length ? (
          <div className="flex flex-col gap-3">
            {rootComments.map((comment) => (
              <TaskCommentItem
                key={comment.id}
                comment={comment}
                replies={comments.filter(
                  (reply) => reply.parent_comment_id === comment.id
                )}
                canComment={canComment}
                editingTarget={editingTarget}
                replyTarget={replyTarget}
                isCreatePending={isCreatePending}
                isUpdatePending={isUpdatePending}
                isStatePending={isStatePending}
                createError={createError}
                updateError={updateError}
                onEdit={setEditingTarget}
                onReply={setReplyTarget}
                onDelete={setDeleteTarget}
                onResolve={resolveTaskComment}
                onReopen={reopenTaskComment}
                onUpdate={updateTaskComment}
                onCreateReply={createTaskComment}
                onCloseEdit={() => setEditingTarget(null)}
                onCloseReply={() => setReplyTarget(null)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">コメントはありません。</p>
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

            await deleteTaskComment(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      </CardContent>
    </Card>
  );
}

type TaskCommentItemProps = {
  comment: TaskCommentRead;
  replies: TaskCommentRead[];
  canComment: boolean;
  editingTarget: TaskCommentRead | null;
  replyTarget: TaskCommentRead | null;
  isCreatePending: boolean;
  isUpdatePending: boolean;
  isStatePending: boolean;
  createError?: Error | null;
  updateError?: Error | null;
  onEdit: (comment: TaskCommentRead | null) => void;
  onReply: (comment: TaskCommentRead | null) => void;
  onDelete: (comment: TaskCommentRead) => void;
  onResolve: (commentId: number, version: number) => Promise<void>;
  onReopen: (commentId: number, version: number) => Promise<void>;
  onUpdate: (
    commentId: number,
    version: number,
    values: TaskCommentFormValues
  ) => Promise<unknown>;
  onCreateReply: (
    values: TaskCommentFormValues,
    parentCommentId?: number | null
  ) => Promise<unknown>;
  onCloseEdit: () => void;
  onCloseReply: () => void;
};

function TaskCommentItem({
  comment,
  replies,
  canComment,
  editingTarget,
  replyTarget,
  isCreatePending,
  isUpdatePending,
  isStatePending,
  createError,
  updateError,
  onEdit,
  onReply,
  onDelete,
  onResolve,
  onReopen,
  onUpdate,
  onCreateReply,
  onCloseEdit,
  onCloseReply,
}: TaskCommentItemProps) {
  const isEditing = editingTarget?.id === comment.id;
  const isReplying = replyTarget?.id === comment.id;

  return (
    <div className="rounded-lg border p-3">
      <TaskCommentBody
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
          <TaskCommentInlineHeader label="コメント編集" onClose={onCloseEdit} />
          <TaskCommentForm
            initialValues={{ body: comment.body }}
            submitLabel="コメント更新"
            resetOnSuccess={false}
            isPending={isUpdatePending}
            error={updateError}
            onSubmit={(values) => onUpdate(comment.id, comment.version, values)}
            onSuccess={onCloseEdit}
          />
        </div>
      ) : null}

      {isReplying ? (
        <div className="mt-3 rounded-lg bg-muted p-3">
          <TaskCommentInlineHeader label="返信" onClose={onCloseReply} />
          <TaskCommentForm
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
            <TaskCommentBody
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

function TaskCommentBody({
  comment,
  canComment,
  isStatePending,
  onEdit,
  onReply,
  onDelete,
  onResolve,
  onReopen,
}: {
  comment: TaskCommentRead;
  canComment: boolean;
  isStatePending: boolean;
  onEdit: (comment: TaskCommentRead | null) => void;
  onReply: (comment: TaskCommentRead | null) => void;
  onDelete: (comment: TaskCommentRead) => void;
  onResolve: (commentId: number, version: number) => Promise<void>;
  onReopen: (commentId: number, version: number) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          作成者ID: {comment.created_by ?? "-"} / {formatDateTime(comment.created_at)}
        </span>
        {comment.is_resolved ? (
          <span className="text-xs text-muted-foreground">解決済み</span>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
      {canComment ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onReply(comment)}>
            <MessageSquareReplyIcon data-icon="inline-start" />
            返信
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onEdit(comment)}>
            <PencilIcon data-icon="inline-start" />
            編集
          </Button>
          {comment.is_resolved ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isStatePending}
              onClick={() => onReopen(comment.id, comment.version)}
            >
              <RotateCcwIcon data-icon="inline-start" />
              再オープン
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isStatePending}
              onClick={() => onResolve(comment.id, comment.version)}
            >
              <CheckIcon data-icon="inline-start" />
              解決
            </Button>
          )}
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

function TaskCommentInlineHeader({
  label,
  onClose,
}: {
  label: string;
  onClose: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="text-sm font-medium">{label}</span>
      <Button type="button" variant="outline" size="sm" onClick={onClose}>
        <XIcon data-icon="inline-start" />
        閉じる
      </Button>
    </div>
  );
}

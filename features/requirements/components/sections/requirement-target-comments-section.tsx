"use client";

import { CommentContent } from "@/components/shared/comments/comment-content";
import { useState } from "react";

import { CommentInlineHeader } from "@/components/shared/comments/comment-inline-header";
import { CommentThreadList } from "@/components/shared/comments/comment-thread-list";
import { CommentThreadActions } from "@/components/shared/comments/comment-thread-actions";
import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import type { RequirementTargetCommentRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";
import { cn } from "@/lib/utils";

import { useCreateTargetComment } from "../../hooks/use-create-target-comment";
import { useDeleteTargetComment } from "../../hooks/use-delete-target-comment";
import { useTargetComments } from "../../hooks/use-target-comments";
import { useToggleTargetCommentState } from "../../hooks/use-toggle-target-comment-state";
import { useUpdateTargetComment } from "../../hooks/use-update-target-comment";
import { getRequirementCommentAnchorLabel } from "../../lib/requirement-comment-anchor";
import type { ReviewAnchorStatus } from "../../lib/requirement-review-anchor";
import { RequirementTargetCommentForm } from "../forms/requirement-target-comment-form";
import { RequirementSectionSkeleton } from "../shared/requirement-section-skeleton";

type RequirementTargetCommentsSectionProps = {
  projectId: number;
  targetType: string;
  targetId: number;
  title?: string;
  canComment: boolean;
  targetLabel?: string;
  selectedTargetAnchor?: Record<string, unknown> | null;
  onTargetAnchorClick?: (targetAnchor: Record<string, unknown>) => void;
  getTargetAnchorStatus?: (
    targetAnchor: Record<string, unknown>,
  ) => ReviewAnchorStatus | null;
  showTargetAnchorInput?: boolean;
  className?: string;
  contentClassName?: string;
};

export function RequirementTargetCommentsSection({
  projectId,
  targetType,
  targetId,
  title = "スレッドコメント",
  canComment,
  targetLabel,
  selectedTargetAnchor = null,
  onTargetAnchorClick,
  getTargetAnchorStatus,
  showTargetAnchorInput = true,
  className,
  contentClassName,
}: RequirementTargetCommentsSectionProps) {
  const { user } = useAuth();
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const canModerateComments = currentProjectRole?.role?.key === "project_admin";
  const canMutateComment = (comment: RequirementTargetCommentRead) =>
    canComment && (canModerateComments || comment.author_id === user?.id);
  const [deleteTarget, setDeleteTarget] =
    useState<RequirementTargetCommentRead | null>(null);
  const { comments, isLoading } = useTargetComments(
    projectId,
    targetType,
    targetId,
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
        {targetLabel ? (
          <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
            現在の対象: {targetLabel}
          </div>
        ) : null}

        {canComment ? (
          <RequirementTargetCommentForm
            projectId={projectId}
            key={JSON.stringify(selectedTargetAnchor)}
            initialValues={{
              body: "",
              targetAnchor: selectedTargetAnchor
                ? JSON.stringify(selectedTargetAnchor)
                : "",
              reason: "",
            }}
            showTargetAnchorInput={showTargetAnchorInput}
            targetAnchorLabel={getRequirementCommentAnchorLabel(
              selectedTargetAnchor,
            )}
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
          canEditComment={canMutateComment}
          canReplyComment={() => canComment}
          loadingFallback={<RequirementSectionSkeleton />}
          renderCommentBody={({ comment, onEdit, onReply }) => (
            <CommentBody
              comment={comment}
              canComment={canComment}
              canMutate={canMutateComment(comment)}
              isStatePending={isStatePending}
              onEdit={onEdit}
              onReply={onReply}
              onDelete={setDeleteTarget}
              onResolve={resolveTargetComment}
              onReopen={reopenTargetComment}
              onTargetAnchorClick={onTargetAnchorClick}
              getTargetAnchorStatus={getTargetAnchorStatus}
            />
          )}
          renderEditForm={({ comment, onClose }) => (
            <>
              <CommentInlineHeader label="コメント編集" onClose={onClose} />
              <RequirementTargetCommentForm
                projectId={projectId}
                initialValues={{
                  body: comment.body,
                  mentions: comment.mentions,
                  targetAnchor: getRequirementCommentAnchorLabel(
                    comment.target_anchor,
                  ),
                  reason: "",
                }}
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
                projectId={projectId}
                initialValues={{ body: "", targetAnchor: "", reason: "" }}
                submitLabel="返信追加"
                showTargetAnchorInput={false}
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
  canMutate: boolean;
  isStatePending: boolean;
  onEdit: (comment: RequirementTargetCommentRead) => void;
  onReply: (comment: RequirementTargetCommentRead) => void;
  onDelete: (comment: RequirementTargetCommentRead) => void;
  onResolve: (commentId: number, version: number) => Promise<void>;
  onReopen: (commentId: number, version: number) => Promise<void>;
  onTargetAnchorClick?: (targetAnchor: Record<string, unknown>) => void;
  getTargetAnchorStatus?: (
    targetAnchor: Record<string, unknown>,
  ) => ReviewAnchorStatus | null;
};

function CommentBody({
  comment,
  canComment,
  canMutate,
  isStatePending,
  onEdit,
  onReply,
  onDelete,
  onResolve,
  onReopen,
  onTargetAnchorClick,
  getTargetAnchorStatus,
}: CommentBodyProps) {
  const targetAnchorStatus = comment.target_anchor
    ? getTargetAnchorStatus?.(comment.target_anchor)
    : null;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-1 text-xs leading-5 text-muted-foreground">
        <span className="truncate">
          {comment.author?.name ?? `投稿者ID: ${comment.author_id}`}
        </span>
        <span>{formatDateTime(comment.created_at)}</span>
        <span>{comment.is_resolved ? "解決済み" : "未解決"}</span>
      </div>
      {canComment ? (
        <CommentThreadActions
          comment={comment}
          isResolved={comment.is_resolved}
          isStatePending={isStatePending}
          resolvePlacement="first"
          reopenLabel="再開"
          canEdit={canMutate}
          canDelete={canMutate}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onResolve={() => onResolve(comment.id, comment.version)}
          onReopen={() => onReopen(comment.id, comment.version)}
        />
      ) : null}
      {comment.target_anchor ? (
        <button
          type="button"
          className="w-full rounded-md border bg-muted px-3 py-2 text-left text-xs leading-5 text-muted-foreground hover:bg-accent"
          onClick={() => onTargetAnchorClick?.(comment.target_anchor ?? {})}
        >
          <span className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              対象
            </span>
            <span className="break-words">
              {getRequirementCommentAnchorLabel(comment.target_anchor)}
            </span>
            {typeof comment.target_anchor.quote === "string" ? (
              <blockquote className="border-l-2 pl-2 whitespace-pre-wrap break-words">
                {comment.target_anchor.quote}
              </blockquote>
            ) : null}
            {targetAnchorStatus ? (
              <span>{getTargetAnchorStatusLabel(targetAnchorStatus)}</span>
            ) : null}
          </span>
        </button>
      ) : null}
      <p className="whitespace-pre-wrap break-words text-sm">
        <CommentContent body={comment.body} mentions={comment.mentions} />
      </p>
    </div>
  );
}

const getTargetAnchorStatusLabel = (status: ReviewAnchorStatus) => {
  switch (status) {
    case "current":
      return "アンカー状態: 現在";
    case "moved":
      return "アンカー状態: 位置変更";
    case "changed":
      return "アンカー状態: 対象更新";
    case "missing":
      return "アンカー状態: 失効";
  }
};

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
import { MessageSquareIcon } from "lucide-react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import type { RequirementTargetCommentRead } from "@/lib/api/generated/model";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
  embedded?: boolean;
  headerAction?: React.ReactNode;
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
  embedded = false,
  headerAction,
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
  const [filter, setFilter] = useState("all");
  const actionableRoots = comments.filter(
    (comment) => !comment.parent_comment_id && isActionableComment(comment),
  );
  const visibleComments =
    filter === "all" || !actionableRoots.length
      ? comments
      : filterCommentThreads(
          comments,
          actionableRoots.filter(
            (comment) => comment.is_resolved === (filter === "resolved"),
          ),
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

  const filters = (
    <>
      {targetLabel ? (
        <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
          現在の対象: {targetLabel}
        </div>
      ) : null}

      {actionableRoots.length ? (
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(value) => {
            if (value) setFilter(value);
          }}
          size="sm"
          aria-label="指摘コメントの表示"
          className="self-start"
        >
          <ToggleGroupItem value="all">すべて</ToggleGroupItem>
          <ToggleGroupItem value="open">未解決</ToggleGroupItem>
          <ToggleGroupItem value="resolved">解決済み</ToggleGroupItem>
        </ToggleGroup>
      ) : null}
    </>
  );
  const thread = (
    <CommentThreadList
      comments={visibleComments}
      isLoading={isLoading}
      canComment={canComment}
      emptyMessage={
        filter === "all" || !actionableRoots.length
          ? "コメントはありません。"
          : filter === "open"
            ? "未解決の指摘はありません。"
            : "解決済みの指摘はありません。"
      }
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
            memoryKey={`comment:edit:${comment.id}:${comment.version}`}
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
            memoryKey={`comment:reply:${comment.id}`}
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
  );
  const composer = canComment ? (
    <RequirementTargetCommentForm
      projectId={projectId}
      memoryKey={`comment:create:${JSON.stringify(selectedTargetAnchor)}`}
      key={JSON.stringify(selectedTargetAnchor)}
      initialValues={{
        body: "",
        targetAnchor: selectedTargetAnchor
          ? JSON.stringify(selectedTargetAnchor)
          : "",
        reason: "",
      }}
      showTargetAnchorInput={showTargetAnchorInput}
      targetAnchorLabel={getRequirementCommentAnchorLabel(selectedTargetAnchor)}
      isPending={isCreatePending}
      error={createError}
      onSubmit={(values) => createTargetComment(values)}
    />
  ) : null;

  return (
    <section
      className={cn("flex min-h-0 min-w-0 flex-col", className)}
      aria-label={embedded ? title : undefined}
    >
      {!embedded ? (
        <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-1">
          <h3 className="flex min-w-0 items-center gap-2 font-semibold">
            <MessageSquareIcon aria-hidden="true" className="size-4" />
            {title}
            {comments.length > 0 ? (
              <span className="text-sm font-normal text-muted-foreground">
                {comments.length}
              </span>
            ) : null}
          </h3>
          {headerAction}
        </header>
      ) : null}
      <div
        className={cn(
          "shrink-0 space-y-2 empty:hidden",
          !embedded && "border-b border-border/60 px-3 pb-2",
        )}
      >
        {filters}
      </div>
      <div
        className={cn(
          "min-h-0 min-w-0 flex-1",
          !embedded && "px-3",
          contentClassName,
        )}
      >
        {thread}
      </div>
      {composer ? (
        <div
          className={cn(
            "shrink-0 border-t border-border/60 pt-3",
            !embedded && "px-3 pb-2",
          )}
        >
          {composer}
        </div>
      ) : null}
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
    </section>
  );
}

function isActionableComment(comment: RequirementTargetCommentRead) {
  return Boolean(comment.target_anchor || comment.is_resolved);
}

function filterCommentThreads(
  comments: RequirementTargetCommentRead[],
  roots: RequirementTargetCommentRead[],
) {
  const byId = new Map(comments.map((item) => [item.id, item]));
  const selected = new Set(roots.map((root) => root.id));
  return comments.filter((comment) => {
    let ancestor: RequirementTargetCommentRead | undefined = comment;
    while (ancestor?.parent_comment_id != null) {
      ancestor = byId.get(ancestor.parent_comment_id);
    }
    return ancestor && selected.has(ancestor.id);
  });
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
  const anchor = comment.target_anchor;
  const quote = typeof anchor?.quote === "string" ? anchor.quote : null;
  const anchorLabel =
    typeof anchor?.label === "string"
      ? anchor.label
      : quote
        ? "対象の文章"
        : getRequirementCommentAnchorLabel(anchor);

  return (
    <CommentMessage
      images={comment.images}
      author={comment.author?.name}
      avatarUrl={comment.author?.avatar_url}
      createdAt={comment.created_at}
      reply={Boolean(comment.parent_comment_id)}
      resolved={comment.is_resolved}
      menu={
        canMutate ? (
          <CommentMessageMenu
            onEdit={() => onEdit(comment)}
            onDelete={() => onDelete(comment)}
          />
        ) : null
      }
    >
      {anchor && anchorLabel ? (
        <div className="border-s-2 ps-2 text-xs text-muted-foreground [overflow-wrap:anywhere]">
          {onTargetAnchorClick ? (
            <button
              type="button"
              className="text-start font-medium underline-offset-2 hover:underline"
              onClick={() => onTargetAnchorClick(anchor)}
            >
              {anchorLabel}
            </button>
          ) : (
            <span className="font-medium">{anchorLabel}</span>
          )}
          {quote && quote.length > 110 ? (
            <details>
              <summary className="cursor-pointer">
                {quote.slice(0, 110)}…
              </summary>
              <blockquote className="whitespace-pre-wrap">{quote}</blockquote>
            </details>
          ) : quote ? (
            <blockquote className="whitespace-pre-wrap">{quote}</blockquote>
          ) : null}
          {targetAnchorStatus && targetAnchorStatus !== "current" ? (
            <p>{getTargetAnchorStatusLabel(targetAnchorStatus)}</p>
          ) : null}
        </div>
      ) : null}
      <p className="whitespace-pre-wrap break-words text-sm">
        <CommentContent body={comment.body} mentions={comment.mentions} />
      </p>
      {canComment ? (
        <CommentThreadActions
          comment={comment}
          isResolved={comment.is_resolved}
          isStatePending={isStatePending}
          reopenLabel="再開"
          canResolve={
            !comment.parent_comment_id && isActionableComment(comment)
          }
          onReply={onReply}
          onResolve={() => onResolve(comment.id, comment.version)}
          onReopen={() => onReopen(comment.id, comment.version)}
        />
      ) : null}
    </CommentMessage>
  );
}

const getTargetAnchorStatusLabel = (status: ReviewAnchorStatus) => {
  switch (status) {
    case "current":
      return "";
    case "moved":
      return "対象の位置が変わりました";
    case "changed":
      return "対象の内容が変わりました";
    case "missing":
      return "元の対象を確認できません";
  }
};

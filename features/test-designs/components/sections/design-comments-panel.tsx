"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CommentThreadActions } from "@/components/shared/comments/comment-thread-actions";
import { CommentThreadList } from "@/components/shared/comments/comment-thread-list";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { isSystemAdmin } from "@/features/auth/utils/authorization";
import type {
  TestDesignCommentCreate,
  TestDesignCommentRead,
} from "@/lib/api/generated/model";
import {
  createTestDesignCommentProjectsProjectIdTestDesignsDesignIdCommentsPost as createComment,
  deleteTestDesignCommentProjectsProjectIdTestDesignsDesignIdCommentsCommentIdDelete as deleteComment,
  listTestDesignCommentsProjectsProjectIdTestDesignsDesignIdCommentsGet as listComments,
  listTestDesignCommentChangesProjectsProjectIdTestDesignsDesignIdCommentsCommentIdChangesGet as listChanges,
  updateTestDesignCommentProjectsProjectIdTestDesignsDesignIdCommentsCommentIdPatch as updateComment,
} from "@/lib/api/generated/test-collaboration/test-collaboration";
import { formatDateTime } from "@/lib/format/date";

import { useConfirmAction } from "../../hooks/use-confirm-action";

export type DesignCommentTarget = Pick<
  TestDesignCommentCreate,
  "target_type" | "target_id" | "field"
>;

function targetKey(target: {
  target_type: string;
  target_id?: string | null;
  field?: string | null;
}) {
  return `${target.target_type}:${target.target_id ?? ""}:${target.field ?? ""}`;
}

function CommentComposer({
  initial = "",
  label,
  onSubmit,
  onClose,
}: {
  initial?: string;
  label: string;
  onSubmit: (body: string) => Promise<boolean>;
  onClose?: () => void;
}) {
  const [body, setBody] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!body.trim()) return;
        setBusy(true);
        try {
          if (await onSubmit(body.trim())) {
            setBody("");
            onClose?.();
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block text-sm font-medium">{label}</label>
      <textarea
        className="min-h-20 w-full rounded-md border p-2 text-sm"
        maxLength={20000}
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" type="submit" disabled={busy || !body.trim()}>
          投稿
        </Button>
        {onClose && (
          <Button size="sm" type="button" variant="outline" onClick={onClose}>
            キャンセル
          </Button>
        )}
      </div>
    </form>
  );
}

const changeLabels: Record<string, string> = {
  created: "投稿",
  updated: "本文を編集",
  resolved: "解決",
  reopened: "再開",
  deleted: "削除",
};

function CommentHistory({
  projectId,
  designId,
  commentId,
}: {
  projectId: number;
  designId: number;
  commentId: number;
}) {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["test-design-comment-changes", projectId, designId, commentId],
    queryFn: () => listChanges(projectId, designId, commentId),
    enabled: open,
  });
  return (
    <div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "履歴を閉じる" : "変更履歴"}
      </Button>
      {open && (
        <div className="space-y-2 border-l pl-3 text-xs">
          {query.isLoading && <p>読み込み中…</p>}
          {query.error && <p role="alert">履歴を読み込めませんでした。</p>}
          {query.data?.map((change) => (
            <div key={change.id}>
              <p className="font-medium">
                {changeLabels[change.action] ?? change.action} ·{" "}
                {formatDateTime(change.created_at)}
              </p>
              {change.action === "updated" && (
                <div className="space-y-1 whitespace-pre-wrap break-words">
                  <p>変更前: {String(change.old_value?.body ?? "")}</p>
                  <p>変更後: {String(change.new_value?.body ?? "")}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DesignCommentsPanel({
  projectId,
  designId,
  target,
  targetLabel,
  disabled,
  canComment,
  onSelectTarget,
}: {
  projectId: number;
  designId: number;
  target: DesignCommentTarget | null;
  targetLabel: string;
  disabled: boolean;
  canComment: boolean;
  onSelectTarget?: (target: DesignCommentTarget, label: string) => void;
}) {
  const { user } = useAuth();
  const client = useQueryClient();
  const { confirm, confirmDialogProps } = useConfirmAction();
  const key = ["test-design-comments", projectId, designId];
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: key,
    queryFn: () => listComments(projectId, designId),
  });
  const currentTarget: DesignCommentTarget = target ?? {
    target_type: "design",
  };
  const visible = showAll
    ? (query.data ?? [])
    : (query.data ?? []).filter(
        (comment) => targetKey(comment) === targetKey(currentTarget),
      );
  const unresolved = (query.data ?? []).filter(
    (comment) => !comment.is_resolved && !comment.deleted_at,
  ).length;

  async function mutate(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await client.invalidateQueries({ queryKey: key });
      await client.invalidateQueries({
        queryKey: ["test-design-comment-changes", projectId, designId],
      });
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "コメントを更新できませんでした",
      );
      await client.invalidateQueries({ queryKey: key });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const canEdit = (comment: TestDesignCommentRead) =>
    canComment &&
    !comment.deleted_at &&
    (isSystemAdmin(user) || comment.author_id === user?.id);

  return (
    <section className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">設計コメント · 未解決 {unresolved}件</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? "選択対象のみ" : "全てのコメント"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">対象: {targetLabel}</p>
      {disabled ? (
        <p className="text-sm text-muted-foreground">
          コメントするには設計書を保存してください。
        </p>
      ) : canComment ? (
        <CommentComposer
          key={targetKey(currentTarget)}
          label="選択した対象にコメント"
          onSubmit={(body) =>
            mutate(() =>
              createComment(projectId, designId, { ...currentTarget, body }),
            )
          }
        />
      ) : null}
      <CommentThreadList
        comments={visible}
        isLoading={query.isLoading}
        canComment={canComment && !disabled}
        emptyMessage="コメントはありません。"
        getCommentId={(comment) => comment.id}
        getParentCommentId={(comment) => comment.parent_comment_id}
        canEditComment={canEdit}
        canReplyComment={(comment) => !comment.deleted_at}
        renderCommentBody={({ comment, onEdit, onReply }) => (
          <div className="space-y-2 text-sm">
            <p className="text-xs text-muted-foreground">
              {comment.author_name ?? `投稿者 ${comment.author_id}`} ·{" "}
              {formatDateTime(comment.created_at)} ·{" "}
              {comment.is_resolved ? "解決済み" : "未解決"}
            </p>
            <button
              type="button"
              className="rounded border px-2 py-1 text-left text-xs hover:bg-muted"
              onClick={() =>
                onSelectTarget?.(
                  {
                    target_type:
                      comment.target_type as DesignCommentTarget["target_type"],
                    target_id: comment.target_id,
                    field: comment.field,
                  },
                  String(comment.target_snapshot.label ?? "コメント対象"),
                )
              }
            >
              {comment.target_snapshot.label as string} {comment.field ?? ""} ·{" "}
              {comment.target_status === "missing"
                ? "対象削除済み"
                : comment.target_status === "changed"
                  ? "対象に変更あり"
                  : "現在の対象"}
            </button>
            <p className="whitespace-pre-wrap break-words">{comment.body}</p>
            <CommentHistory
              projectId={projectId}
              designId={designId}
              commentId={comment.id}
            />
            {canComment && !disabled && !comment.deleted_at && (
              <CommentThreadActions
                comment={comment}
                isResolved={comment.is_resolved}
                isStatePending={busy}
                canEdit={canEdit(comment)}
                canDelete={canEdit(comment)}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={() =>
                  confirm({
                    title: "コメントを削除しますか？",
                    description:
                      "返信と変更履歴は保持し、本文を非表示にします。",
                    confirmLabel: "削除",
                    destructive: true,
                    onConfirm: () =>
                      void mutate(() =>
                        deleteComment(projectId, designId, comment.id, {
                          version: comment.version,
                        }),
                      ),
                  })
                }
                onResolve={() =>
                  void mutate(() =>
                    updateComment(projectId, designId, comment.id, {
                      version: comment.version,
                      is_resolved: true,
                    }),
                  )
                }
                onReopen={() =>
                  void mutate(() =>
                    updateComment(projectId, designId, comment.id, {
                      version: comment.version,
                      is_resolved: false,
                    }),
                  )
                }
              />
            )}
          </div>
        )}
        renderEditForm={({ comment, onClose }) => (
          <CommentComposer
            initial={comment.body}
            label="コメントを編集"
            onClose={onClose}
            onSubmit={(body) =>
              mutate(() =>
                updateComment(projectId, designId, comment.id, {
                  version: comment.version,
                  body,
                }),
              )
            }
          />
        )}
        renderReplyForm={({ comment, onClose }) => (
          <CommentComposer
            label="返信"
            onClose={onClose}
            onSubmit={(body) =>
              mutate(() =>
                createComment(projectId, designId, {
                  target_type:
                    comment.target_type as DesignCommentTarget["target_type"],
                  target_id: comment.target_id,
                  field: comment.field,
                  parent_comment_id: comment.id,
                  body,
                }),
              )
            }
          />
        )}
      />
      <ConfirmDialog {...confirmDialogProps} />
    </section>
  );
}

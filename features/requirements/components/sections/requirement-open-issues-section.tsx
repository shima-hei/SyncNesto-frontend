"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  EditIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RequirementOpenIssueRead } from "@/lib/api/generated/model";
import { scrollToRequirementContent } from "@/features/requirements/lib/scroll-to-requirement-content";
import { useProjectMemberUsers } from "@/features/projects/hooks/use-project-member-users";
import { formatDate, formatDateTime } from "@/lib/format/date";

import { getRequirementOpenIssueStatusLabel } from "../../constants/requirement-options";
import { useCreateOpenIssue } from "../../hooks/use-create-open-issue";
import { useDeleteOpenIssue } from "../../hooks/use-delete-open-issue";
import { useOpenIssues } from "../../hooks/use-open-issues";
import { usePromoteOpenIssue } from "../../hooks/use-promote-open-issue";
import { useUpdateOpenIssue } from "../../hooks/use-update-open-issue";
import { RequirementOpenIssueForm } from "../forms/requirement-open-issue-form";
import { RequirementSectionSkeleton } from "../shared/requirement-section-skeleton";
import { RequirementTargetCommentsSection } from "./requirement-target-comments-section";
import {
  evaluateRequirementReviewAnchor,
  isRequirementReviewTargetAnchor,
} from "../../lib/requirement-review-anchor";
import type { RequirementOpenIssueFormValues } from "../../types/requirement-open-issue-form";

type RequirementOpenIssuesSectionProps = {
  projectId: number;
  documentId: number;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canComment: boolean;
  resolved?: boolean;
  onCreated?: () => void;
};

export function RequirementOpenIssuesSection({
  projectId,
  documentId,
  canCreate,
  canUpdate,
  canDelete,
  canComment,
  resolved,
  onCreated,
}: RequirementOpenIssuesSectionProps) {
  const { users } = useProjectMemberUsers(projectId, { limit: 100 });
  const names = new Map(users.map((user) => [user.id, user.name]));
  const [commentTargets, setCommentTargets] = useState<number[]>([]);
  const [deleteTarget, setDeleteTarget] =
    useState<RequirementOpenIssueRead | null>(null);
  const [editingTarget, setEditingTarget] =
    useState<RequirementOpenIssueRead | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const createButton = useRef<HTMLButtonElement>(null);
  const [requestedPages, setRequestedPages] = useState<Record<string, number>>(
    {},
  );
  const pageKey = String(resolved);
  const page = requestedPages[pageKey] ?? 1;
  const pageSize = 10;
  const { openIssues, isLoading, isFetching, error, total, refetch } =
    useOpenIssues(projectId, documentId, { page, pageSize, resolved });
  const lastPage = Math.max(1, Math.ceil((total ?? 0) / pageSize));
  if (total !== undefined && page > lastPage) {
    setRequestedPages({ ...requestedPages, [pageKey]: lastPage });
  }
  const {
    createOpenIssue,
    isPending: isCreatePending,
    error: createError,
  } = useCreateOpenIssue(projectId, documentId);
  const { deleteOpenIssue, isPending: isDeletePending } =
    useDeleteOpenIssue(projectId);
  const { promoteOpenIssue, isPending: isPromotePending } =
    usePromoteOpenIssue(projectId);
  const {
    updateOpenIssue,
    isPending: isUpdatePending,
    error: updateError,
  } = useUpdateOpenIssue(projectId);

  return (
    <section aria-label="未決事項" className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">未決事項</h3>
        {canCreate ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            ref={createButton}
            onClick={() => setCreateOpen(true)}
          >
            <PlusIcon data-icon="inline-start" />
            未決事項を追加
          </Button>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        {canCreate ? (
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              if (!isCreatePending) setCreateOpen(open);
            }}
          >
            <DialogContent
              className="max-h-[85dvh] overflow-y-auto sm:max-w-xl"
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                createButton.current?.focus();
              }}
            >
              <DialogHeader>
                <DialogTitle>未決事項を追加</DialogTitle>
                <DialogDescription>
                  決める必要があることを記録します。
                </DialogDescription>
              </DialogHeader>
              <RequirementOpenIssueForm
                projectId={projectId}
                documentId={documentId}
                isPending={isCreatePending}
                error={createError}
                onSubmit={async (values) => {
                  await createOpenIssue(values);
                  setCreateOpen(false);
                  onCreated?.();
                }}
              />
            </DialogContent>
          </Dialog>
        ) : null}

        {isLoading ? (
          <RequirementSectionSkeleton />
        ) : error ? (
          <DataLoadError
            resourceName="未決事項"
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        ) : openIssues.length ? (
          <div className="divide-y border-y">
            {openIssues.map((issue) => (
              <details
                key={issue.id}
                data-open-issue-id={issue.id}
                className="group min-w-0"
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 rounded-sm py-3 text-sm marker:content-none hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                  <span className="text-xs text-muted-foreground">
                    {issue.issue_code}
                  </span>
                  <span
                    data-open-issue-field="title"
                    className="min-w-0 flex-1 scroll-mt-24 font-medium [overflow-wrap:anywhere]"
                  >
                    {issue.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getRequirementOpenIssueStatusLabel(issue.status)}
                  </span>
                  <ChevronDownIcon
                    className="size-4 text-muted-foreground group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <section
                  aria-label="未決事項の詳細"
                  className="mb-3 space-y-4 rounded-lg border bg-card p-4"
                >
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">論点</h4>
                    <p
                      data-open-issue-field="description"
                      className="scroll-mt-24 whitespace-pre-wrap text-sm"
                    >
                      {issue.description || "論点の説明は未入力です。"}
                    </p>
                  </div>
                  <dl className="grid min-w-0 grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">担当者</dt>
                      <dd>
                        {issue.assignee_id == null
                          ? "未設定"
                          : (names.get(issue.assignee_id) ??
                            "氏名を表示できない担当者")}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">
                        回答期限
                      </dt>
                      <dd>
                        {issue.due_date ? formatDate(issue.due_date) : "未設定"}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">
                        関連要件
                      </dt>
                      <dd>
                        {issue.related_requirement_id ? (
                          <Link
                            className="underline underline-offset-4"
                            href={`/projects/joined/${projectId}/requirements/${documentId}/items/${issue.related_requirement_id}`}
                          >
                            関連要件を開く
                          </Link>
                        ) : (
                          "未設定"
                        )}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">
                        承認への影響
                      </dt>
                      <dd
                        className={
                          issue.blocks_approval !== false &&
                          issue.status !== "resolved"
                            ? "text-[var(--status-warning-fg)]"
                            : undefined
                        }
                      >
                        {issue.blocks_approval !== false
                          ? "対応必須"
                          : "対応任意"}
                      </dd>
                    </div>
                    {issue.impact_scope ? (
                      <div className="min-w-0 sm:col-span-2">
                        <dt className="text-xs text-muted-foreground">
                          影響範囲
                        </dt>
                        <dd className="[overflow-wrap:anywhere]">
                          {issue.impact_scope}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  <div className="space-y-2 border-t pt-3">
                    <h4 className="text-sm font-semibold">決定内容</h4>
                    <p
                      data-open-issue-field="resolution"
                      className="scroll-mt-24 whitespace-pre-wrap text-sm text-muted-foreground"
                    >
                      {issue.resolution || "決定内容は未記録です。"}
                    </p>
                  </div>
                  <div className="space-y-2 border-t pt-3">
                    <h4 className="text-sm font-semibold">アクティビティ</h4>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      <li>
                        登録 {formatDateTime(issue.created_at)}
                        {issue.created_by && names.has(issue.created_by)
                          ? ` ・ ${names.get(issue.created_by)}`
                          : ""}
                      </li>
                      {issue.updated_at !== issue.created_at ? (
                        <li>
                          最終更新 {formatDateTime(issue.updated_at)}
                          {issue.updated_by && names.has(issue.updated_by)
                            ? ` ・ ${names.get(issue.updated_by)}`
                            : ""}
                        </li>
                      ) : null}
                    </ul>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-expanded={commentTargets.includes(issue.id)}
                      aria-controls={`open-issue-comments-${issue.id}`}
                      onClick={() =>
                        setCommentTargets((previous) =>
                          previous.includes(issue.id)
                            ? previous.filter((id) => id !== issue.id)
                            : [...previous, issue.id],
                        )
                      }
                    >
                      コメント・指摘
                    </Button>
                    {canUpdate && issue.status !== "resolved" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPromotePending}
                        onClick={() => promoteOpenIssue(issue)}
                      >
                        <ArrowUpRightIcon data-icon="inline-start" />
                        要件化
                      </Button>
                    ) : null}
                    {canUpdate ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTarget(issue)}
                      >
                        <EditIcon data-icon="inline-start" />
                        編集
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(issue)}
                      >
                        <Trash2Icon data-icon="inline-start" />
                        削除
                      </Button>
                    ) : null}
                  </div>
                </section>
                {commentTargets.includes(issue.id) ? (
                  <div id={`open-issue-comments-${issue.id}`} className="mt-4">
                    <RequirementTargetCommentsSection
                      projectId={projectId}
                      targetType="open_issue"
                      targetId={issue.id}
                      canComment={canComment}
                      showTargetAnchorInput={false}
                      onTargetAnchorClick={(anchor) => {
                        if (typeof anchor.field !== "string") return;
                        scrollToRequirementContent(
                          document.querySelector(
                            `[data-open-issue-id="${issue.id}"] [data-open-issue-field="${CSS.escape(anchor.field)}"]`,
                          ),
                        );
                      }}
                      getTargetAnchorStatus={(anchor) => {
                        if (!isRequirementReviewTargetAnchor(anchor))
                          return null;
                        const value =
                          issue[anchor.field as keyof RequirementOpenIssueRead];
                        return evaluateRequirementReviewAnchor(
                          anchor,
                          typeof value === "string" ? value : "",
                          issue.version,
                        );
                      }}
                    />
                  </div>
                ) : null}
                {editingTarget?.id === issue.id ? (
                  <div className="mt-4 rounded-lg bg-muted p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">未決事項編集</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTarget(null)}
                      >
                        <XIcon data-icon="inline-start" />
                        閉じる
                      </Button>
                    </div>
                    <RequirementOpenIssueForm
                      projectId={projectId}
                      documentId={documentId}
                      initialValues={toOpenIssueFormValues(issue)}
                      submitLabel="未決事項更新"
                      resetOnSuccess={false}
                      showReason
                      isPending={isUpdatePending}
                      error={updateError}
                      onSubmit={(values) =>
                        updateOpenIssue(issue.id, issue.version, values)
                      }
                      onSuccess={() => setEditingTarget(null)}
                    />
                  </div>
                ) : null}
              </details>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            未決事項はありません。
          </p>
        )}
        {total !== undefined && total > pageSize ? (
          <DataPagination
            page={page}
            pageSize={pageSize}
            total={total}
            currentCount={openIssues.length}
            isFetching={isFetching}
            onPageChange={(value) =>
              setRequestedPages({ ...requestedPages, [pageKey]: value })
            }
          />
        ) : null}

        <ResourceDeleteDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          resourceName="未決事項"
          description="未決事項を削除します。削除すると元に戻せません。"
          isPending={isDeletePending}
          onConfirm={async () => {
            if (!deleteTarget) {
              return;
            }

            await deleteOpenIssue(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      </div>
    </section>
  );
}

function toOpenIssueFormValues(
  issue: RequirementOpenIssueRead,
): RequirementOpenIssueFormValues {
  return {
    issueCode: issue.issue_code,
    title: issue.title,
    description: issue.description ?? "",
    impactScope: issue.impact_scope ?? "",
    relatedRequirementId: issue.related_requirement_id
      ? String(issue.related_requirement_id)
      : "",
    assigneeId: issue.assignee_id ? String(issue.assignee_id) : "",
    dueDate: issue.due_date ?? "",
    status: issue.status ?? "open",
    resolution: issue.resolution ?? "",
    blocksApproval: issue.blocks_approval ?? true,
    reason: "",
  };
}

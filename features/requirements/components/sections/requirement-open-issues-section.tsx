"use client";

import { useState } from "react";
import { ArrowUpRightIcon, EditIcon, Trash2Icon, XIcon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RequirementOpenIssueRead } from "@/lib/api/generated/model";
import { formatDate } from "@/lib/format/date";

import { getRequirementOpenIssueStatusLabel } from "../../constants/requirement-options";
import { useCreateOpenIssue } from "../../hooks/use-create-open-issue";
import { useDeleteOpenIssue } from "../../hooks/use-delete-open-issue";
import { useOpenIssues } from "../../hooks/use-open-issues";
import { usePromoteOpenIssue } from "../../hooks/use-promote-open-issue";
import { useUpdateOpenIssue } from "../../hooks/use-update-open-issue";
import { RequirementOpenIssueForm } from "../forms/requirement-open-issue-form";
import { RequirementSectionSkeleton } from "../shared/requirement-section-skeleton";
import type { RequirementOpenIssueFormValues } from "../../types/requirement-open-issue-form";

type RequirementOpenIssuesSectionProps = {
  projectId: number;
  documentId: number;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

export function RequirementOpenIssuesSection({
  projectId,
  documentId,
  canCreate,
  canUpdate,
  canDelete,
}: RequirementOpenIssuesSectionProps) {
  const [deleteTarget, setDeleteTarget] =
    useState<RequirementOpenIssueRead | null>(null);
  const [editingTarget, setEditingTarget] =
    useState<RequirementOpenIssueRead | null>(null);
  const { openIssues, isLoading } = useOpenIssues(projectId, documentId);
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
    <Card>
      <CardHeader>
        <CardTitle>未決事項</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canCreate ? (
          <RequirementOpenIssueForm
            projectId={projectId}
            documentId={documentId}
            isPending={isCreatePending}
            error={createError}
            onSubmit={createOpenIssue}
          />
        ) : null}

        {isLoading ? (
          <RequirementSectionSkeleton />
        ) : openIssues.length ? (
          <div className="flex flex-col gap-3">
            {openIssues.map((issue) => (
              <div key={issue.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{issue.issue_code}</span>
                      <span className="text-sm">{issue.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {getRequirementOpenIssueStatusLabel(issue.status)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {issue.description || "説明はありません。"}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      影響範囲: {issue.impact_scope || "-"} / 担当者ID:{" "}
                      {issue.assignee_id ?? "-"} / 期限:{" "}
                      {issue.due_date ? formatDate(issue.due_date) : "-"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      関連要件ID: {issue.related_requirement_id ?? "-"}
                    </span>
                    {issue.resolution ? (
                      <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                        解決内容: {issue.resolution}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
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
                </div>
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
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            未決事項はありません。
          </p>
        )}

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
      </CardContent>
    </Card>
  );
}

function toOpenIssueFormValues(
  issue: RequirementOpenIssueRead
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
    reason: "",
  };
}

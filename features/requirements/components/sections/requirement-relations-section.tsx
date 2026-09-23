"use client";

import { useState } from "react";
import { MessageSquarePlusIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RequirementRelationRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

import {
  getRequirementRelationTargetTypeLabel,
  getRequirementRelationTypeLabel,
} from "../../constants/requirement-options";
import {
  createRequirementRelationCommentAnchor,
  getRequirementCommentAnchorKey,
  type RequirementCommentAnchor,
} from "../../lib/requirement-comment-anchor";
import { useCreateRequirementRelation } from "../../hooks/use-create-requirement-relation";
import { useDeleteRequirementRelation } from "../../hooks/use-delete-requirement-relation";
import { useRequirementRelations } from "../../hooks/use-requirement-relations";
import { RequirementRelationForm } from "../forms/requirement-relation-form";
import { RequirementSectionSkeleton } from "../shared/requirement-section-skeleton";

type RequirementRelationsSectionProps = {
  projectId: number;
  documentId: number;
  currentSectionId?: number | null;
  requirementId: number;
  canLink: boolean;
  onSelectCommentAnchor?: (targetAnchor: RequirementCommentAnchor) => void;
};

export function RequirementRelationsSection({
  projectId,
  documentId,
  currentSectionId,
  requirementId,
  canLink,
  onSelectCommentAnchor,
}: RequirementRelationsSectionProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<RequirementRelationRead | null>(null);
  const { relations, isLoading } = useRequirementRelations(
    projectId,
    requirementId,
  );
  const {
    createRequirementRelation,
    isPending: isCreatePending,
    error: createError,
  } = useCreateRequirementRelation(projectId, requirementId);
  const { deleteRequirementRelation, isPending: isDeletePending } =
    useDeleteRequirementRelation(projectId, requirementId);
  const excludedRequirementIds = [
    requirementId,
    ...relations.flatMap((relation) => {
      if (relation.target_type !== "requirement_item") {
        return [];
      }

      const targetId = Number(relation.target_id);
      return Number.isInteger(targetId) ? [targetId] : [];
    }),
  ];
  const excludedTargetIdsByType = {
    requirement_item: excludedRequirementIds.map(String),
    section: [
      ...(currentSectionId ? [String(currentSectionId)] : []),
      ...relations
        .filter((relation) => relation.target_type === "section")
        .map((relation) => relation.target_id),
    ],
    open_issue: relations
      .filter((relation) => relation.target_type === "open_issue")
      .map((relation) => relation.target_id),
    document: [
      String(documentId),
      ...relations
        .filter((relation) => relation.target_type === "document")
        .map((relation) => relation.target_id),
    ],
  };

  return (
    <Card className="h-[36rem]">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">要件関連</CardTitle>
            <CardDescription>
              ほかの要件や未決事項との依存、重複、関連を記録します。
            </CardDescription>
          </div>
          {canLink ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
            >
              <PlusIcon data-icon="inline-start" />
              関連を追加
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        {isLoading ? (
          <RequirementSectionSkeleton />
        ) : relations.length ? (
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="flex flex-col gap-3">
              {relations.map((relation) => (
                <div
                  key={relation.id}
                  className="scroll-mt-24 rounded-lg border p-3"
                  data-requirement-comment-anchor={getRequirementCommentAnchorKey(
                    createRequirementRelationCommentAnchor(relation),
                  )}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {getRequirementRelationTypeLabel(
                            relation.relation_type,
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {getRequirementRelationTargetTypeLabel(
                            relation.target_type,
                          )}{" "}
                          {formatRelationTarget(relation)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {relation.description || "説明はありません。"}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        作成者: {relation.created_by_user?.name ?? "-"} /{" "}
                        {formatDateTime(relation.created_at)}
                      </span>
                    </div>
                    {canLink || onSelectCommentAnchor ? (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {onSelectCommentAnchor ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onSelectCommentAnchor(
                                createRequirementRelationCommentAnchor(
                                  relation,
                                ),
                              )
                            }
                          >
                            <MessageSquarePlusIcon data-icon="inline-start" />
                            コメント
                          </Button>
                        ) : null}
                        {canLink ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteTarget(relation)}
                          >
                            <Trash2Icon data-icon="inline-start" />
                            削除
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            要件関連はありません。
          </p>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>関連を追加</DialogTitle>
              <DialogDescription>
                関連先と関連種別を選び、必要に応じて関係のメモを残します。
              </DialogDescription>
            </DialogHeader>
            <RequirementRelationForm
              projectId={projectId}
              documentId={documentId}
              excludedRequirementIds={excludedRequirementIds}
              excludedTargetIdsByType={excludedTargetIdsByType}
              isPending={isCreatePending}
              error={createError}
              onSubmit={async (values) => {
                await createRequirementRelation(values);
                setIsCreateOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>

        <ResourceDeleteDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          resourceName="要件関連"
          description="要件関連の紐づけを削除します。対象データ本体は削除されません。"
          isPending={isDeletePending}
          onConfirm={async () => {
            if (!deleteTarget) {
              return;
            }

            await deleteRequirementRelation(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      </CardContent>
    </Card>
  );
}

function formatRelationTarget(relation: RequirementRelationRead) {
  if (!relation.target_summary) {
    return `#${relation.target_id}`;
  }

  return [relation.target_summary.code, relation.target_summary.title]
    .filter(Boolean)
    .join(" ");
}

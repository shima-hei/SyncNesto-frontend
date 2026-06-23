"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RequirementRelationRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

import {
  getRequirementRelationTargetTypeLabel,
  getRequirementRelationTypeLabel,
} from "../../constants/requirement-options";
import { useCreateRequirementRelation } from "../../hooks/use-create-requirement-relation";
import { useDeleteRequirementRelation } from "../../hooks/use-delete-requirement-relation";
import { useRequirementRelations } from "../../hooks/use-requirement-relations";
import { RequirementRelationForm } from "../forms/requirement-relation-form";
import { RequirementSectionSkeleton } from "../shared/requirement-section-skeleton";

type RequirementRelationsSectionProps = {
  projectId: number;
  requirementId: number;
  canLink: boolean;
};

export function RequirementRelationsSection({
  projectId,
  requirementId,
  canLink,
}: RequirementRelationsSectionProps) {
  const [deleteTarget, setDeleteTarget] =
    useState<RequirementRelationRead | null>(null);
  const { relations, isLoading } = useRequirementRelations(
    projectId,
    requirementId
  );
  const {
    createRequirementRelation,
    isPending: isCreatePending,
    error: createError,
  } = useCreateRequirementRelation(projectId, requirementId);
  const { deleteRequirementRelation, isPending: isDeletePending } =
    useDeleteRequirementRelation(projectId, requirementId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">要件関連</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canLink ? (
          <RequirementRelationForm
            isPending={isCreatePending}
            error={createError}
            onSubmit={createRequirementRelation}
          />
        ) : null}

        {isLoading ? (
          <RequirementSectionSkeleton />
        ) : relations.length ? (
          <div className="flex flex-col gap-3">
            {relations.map((relation) => (
              <div key={relation.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {getRequirementRelationTypeLabel(relation.relation_type)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getRequirementRelationTargetTypeLabel(
                          relation.target_type
                        )}{" "}
                        #{relation.target_id}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {relation.description || "説明はありません。"}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      作成者ID: {relation.created_by ?? "-"} /{" "}
                      {formatDateTime(relation.created_at)}
                    </span>
                  </div>
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
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            要件関連はありません。
          </p>
        )}

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

"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RequirementDetailRead } from "@/lib/api/generated/model";

import { useCreateRequirementDetail } from "../../hooks/use-create-requirement-detail";
import { useDeleteRequirementDetail } from "../../hooks/use-delete-requirement-detail";
import { useUpdateRequirementDetail } from "../../hooks/use-update-requirement-detail";
import {
  ALL_REQUIREMENT_DETAIL_TYPES,
  getRequirementDetailFormValues,
} from "../../lib/requirement-detail-metadata";
import type { RequirementDetailFormValues } from "../../types/requirement-detail-form";
import { RequirementDetailForm } from "../forms/requirement-detail-form";
import { RequirementDetailTreeView } from "./requirement-detail-tree-view";

type RequirementDetailsSectionProps = {
  projectId: number;
  requirementId: number;
  details: RequirementDetailRead[];
  canUpdate: boolean;
};

type CreateDialogState = {
  title: string;
  description: string;
  allowedDetailTypes: readonly string[];
  initialValues?: RequirementDetailFormValues;
};

export function RequirementDetailsSection({
  projectId,
  requirementId,
  details,
  canUpdate,
}: RequirementDetailsSectionProps) {
  const [createDialog, setCreateDialog] = useState<CreateDialogState | null>(
    null,
  );
  const [editingTarget, setEditingTarget] =
    useState<RequirementDetailRead | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<RequirementDetailRead | null>(null);
  const {
    createRequirementDetail,
    isPending: isCreatePending,
    error: createError,
  } = useCreateRequirementDetail(projectId, requirementId);
  const {
    updateRequirementDetail,
    isPending: isUpdatePending,
    error: updateError,
  } = useUpdateRequirementDetail(projectId, requirementId);
  const { deleteRequirementDetail, isPending: isDeletePending } =
    useDeleteRequirementDetail(projectId, requirementId);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <CardTitle className="text-base">実現内容</CardTitle>
        {canUpdate ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setCreateDialog({
                title: "実現内容を追加",
                description:
                  "実現単位、画面・操作、入力項目、業務ルールなどを追加します。",
                allowedDetailTypes: ALL_REQUIREMENT_DETAIL_TYPES,
              })
            }
          >
            <PlusIcon data-icon="inline-start" />
            実現内容を追加
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <RequirementDetailTreeView
          details={details}
          canUpdate={canUpdate}
          onEdit={setEditingTarget}
          onDelete={setDeleteTarget}
          onCreate={setCreateDialog}
        />
        <Dialog
          open={Boolean(createDialog)}
          onOpenChange={(open) => !open && setCreateDialog(null)}
        >
          <DialogContent className="max-h-[calc(100vh-2rem)] w-[min(94vw,760px)] overflow-y-auto p-6 sm:max-w-none">
            <DialogHeader>
              <DialogTitle>
                {createDialog?.title ?? "実現内容を追加"}
              </DialogTitle>
              <DialogDescription>{createDialog?.description}</DialogDescription>
            </DialogHeader>
            {createDialog ? (
              <RequirementDetailForm
                key={`${createDialog.title}-${createDialog.initialValues?.detailType ?? "default"}-${createDialog.initialValues?.fields.parent_unit_id ?? ""}-${createDialog.initialValues?.fields.parent_screen_id ?? ""}`}
                details={details}
                allowedDetailTypes={createDialog.allowedDetailTypes}
                initialValues={createDialog.initialValues}
                isPending={isCreatePending}
                error={createError}
                onSubmit={createRequirementDetail}
                onSuccess={() => setCreateDialog(null)}
              />
            ) : null}
          </DialogContent>
        </Dialog>
        <Dialog
          open={Boolean(editingTarget)}
          onOpenChange={(open) => !open && setEditingTarget(null)}
        >
          <DialogContent className="max-h-[calc(100vh-2rem)] w-[min(94vw,760px)] overflow-y-auto p-6 sm:max-w-none">
            <DialogHeader>
              <DialogTitle>実現内容を編集</DialogTitle>
              <DialogDescription>
                実現内容の種類と入力内容を更新します。
              </DialogDescription>
            </DialogHeader>
            {editingTarget ? (
              <RequirementDetailForm
                key={editingTarget.id}
                details={details}
                initialValues={getRequirementDetailFormValues(editingTarget)}
                submitLabel="実現内容を更新"
                resetOnSuccess={false}
                isPending={isUpdatePending}
                error={updateError}
                onSubmit={(values) =>
                  updateRequirementDetail(editingTarget.id, values)
                }
                onSuccess={() => setEditingTarget(null)}
              />
            ) : null}
          </DialogContent>
        </Dialog>
        <ResourceDeleteDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          resourceName="実現内容"
          description="実現内容を削除します。削除すると元に戻せません。"
          isPending={isDeletePending}
          onConfirm={async () => {
            if (!deleteTarget) {
              return;
            }

            await deleteRequirementDetail(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      </CardContent>
    </Card>
  );
}

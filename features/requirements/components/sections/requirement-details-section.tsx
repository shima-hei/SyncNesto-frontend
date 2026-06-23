"use client";

import { useState } from "react";
import { EditIcon, Trash2Icon, XIcon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RequirementDetailRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

import { useCreateRequirementDetail } from "../../hooks/use-create-requirement-detail";
import { useDeleteRequirementDetail } from "../../hooks/use-delete-requirement-detail";
import { useUpdateRequirementDetail } from "../../hooks/use-update-requirement-detail";
import {
  getRequirementDetailFormValues,
  RequirementDetailForm,
} from "../forms/requirement-detail-form";

type RequirementDetailsSectionProps = {
  projectId: number;
  requirementId: number;
  details: RequirementDetailRead[];
  canUpdate: boolean;
};

export function RequirementDetailsSection({
  projectId,
  requirementId,
  details,
  canUpdate,
}: RequirementDetailsSectionProps) {
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
      <CardHeader>
        <CardTitle className="text-base">詳細</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canUpdate ? (
          <RequirementDetailForm
            isPending={isCreatePending}
            error={createError}
            onSubmit={createRequirementDetail}
          />
        ) : null}

        {details.length ? (
          <div className="flex flex-col gap-3">
            {details.map((detail) => (
              <div key={detail.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <span className="text-xs text-muted-foreground">
                      {detail.detail_type} / {formatDateTime(detail.updated_at)}
                    </span>
                    {canUpdate ? (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingTarget(detail)}
                        >
                          <EditIcon data-icon="inline-start" />
                          編集
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTarget(detail)}
                        >
                          <Trash2Icon data-icon="inline-start" />
                          削除
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(detail.detail_json, null, 2)}
                  </pre>
                  {editingTarget?.id === detail.id ? (
                    <div className="rounded-lg bg-muted p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">詳細編集</span>
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
                      <RequirementDetailForm
                        initialValues={getRequirementDetailFormValues(detail)}
                        submitLabel="詳細更新"
                        resetOnSuccess={false}
                        isPending={isUpdatePending}
                        error={updateError}
                        onSubmit={(values) =>
                          updateRequirementDetail(detail.id, values)
                        }
                        onSuccess={() => setEditingTarget(null)}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">詳細はありません。</p>
        )}
        <ResourceDeleteDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          resourceName="詳細"
          description="詳細を削除します。削除すると元に戻せません。"
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

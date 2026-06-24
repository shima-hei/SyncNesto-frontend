"use client";

import { useState } from "react";
import { EditIcon, Trash2Icon, XIcon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MilestoneRead } from "@/lib/api/generated/model";
import { formatDate } from "@/lib/format/date";

import { getMilestoneStatusLabel } from "../../constants/task-options";
import { useCreateMilestone } from "../../hooks/use-create-milestone";
import { useDeleteMilestone } from "../../hooks/use-delete-milestone";
import { useMilestones } from "../../hooks/use-milestones";
import { useUpdateMilestone } from "../../hooks/use-update-milestone";
import {
  defaultMilestoneFormValues,
  getMilestoneFormValues,
} from "../../lib/milestone-mappers";
import { MilestoneForm } from "../forms/milestone-form";

type MilestonesSectionProps = {
  projectId: number;
  canUpdate: boolean;
};

export function MilestonesSection({
  projectId,
  canUpdate,
}: MilestonesSectionProps) {
  const [editingMilestone, setEditingMilestone] =
    useState<MilestoneRead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MilestoneRead | null>(null);
  const { milestones, isLoading } = useMilestones(projectId);
  const {
    createMilestone,
    isPending: isCreatePending,
    error: createError,
  } = useCreateMilestone(projectId);
  const {
    updateMilestone,
    conflictCurrent,
    resetConflict,
    isPending: isUpdatePending,
    error: updateError,
  } = useUpdateMilestone(projectId);
  const { deleteMilestone, isPending: isDeletePending } =
    useDeleteMilestone(projectId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>マイルストーン</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canUpdate ? (
          editingMilestone ? (
            <div className="flex flex-col gap-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">マイルストーン編集</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingMilestone(null);
                    resetConflict();
                  }}
                >
                  <XIcon data-icon="inline-start" />
                  キャンセル
                </Button>
              </div>
              <MilestoneForm
                key={editingMilestone.version}
                mode="update"
                initialValues={getMilestoneFormValues(editingMilestone)}
                isPending={isUpdatePending}
                error={updateError}
                conflictValues={
                  conflictCurrent ? getMilestoneFormValues(conflictCurrent) : null
                }
                onCloseConflict={resetConflict}
                onResolveConflict={(values) => {
                  if (!conflictCurrent) {
                    return Promise.resolve();
                  }

                  return updateMilestone(
                    editingMilestone.id,
                    values,
                    conflictCurrent.version
                  ).then(() => setEditingMilestone(null));
                }}
                onSubmit={(values) =>
                  updateMilestone(
                    editingMilestone.id,
                    values,
                    editingMilestone.version
                  ).then(() => setEditingMilestone(null))
                }
              />
            </div>
          ) : (
            <div className="rounded-lg border p-3">
              <h3 className="mb-3 text-sm font-medium">マイルストーン登録</h3>
              <MilestoneForm
                mode="create"
                initialValues={defaultMilestoneFormValues}
                isPending={isCreatePending}
                error={createError}
                onSubmit={createMilestone}
              />
            </div>
          )
        ) : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            マイルストーンを読み込んでいます。
          </p>
        ) : milestones.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="flex flex-col gap-3 rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {milestone.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(milestone.target_date)} /{" "}
                      {getMilestoneStatusLabel(milestone.status)}
                    </p>
                  </div>
                  {canUpdate ? (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingMilestone(milestone)}
                      >
                        <EditIcon data-icon="inline-start" />
                        編集
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(milestone)}
                      >
                        <Trash2Icon data-icon="inline-start" />
                        削除
                      </Button>
                    </div>
                  ) : null}
                </div>
                {milestone.description ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {milestone.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            マイルストーンはありません。
          </p>
        )}
      </CardContent>

      <ResourceDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        resourceName="マイルストーン"
        isPending={isDeletePending}
        onConfirm={async () => {
          if (!deleteTarget) {
            return;
          }

          await deleteMilestone(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </Card>
  );
}

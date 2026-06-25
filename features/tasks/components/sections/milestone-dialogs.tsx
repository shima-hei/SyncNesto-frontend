"use client";

import { EditIcon, Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MilestoneRead } from "@/lib/api/generated/model";
import { formatDate } from "@/lib/format/date";

import { getMilestoneStatusLabel } from "../../constants/task-options";
import { useCreateMilestone } from "../../hooks/use-create-milestone";
import { useDeleteMilestone } from "../../hooks/use-delete-milestone";
import { useUpdateMilestone } from "../../hooks/use-update-milestone";
import {
  defaultMilestoneFormValues,
  getMilestoneFormValues,
} from "../../lib/milestone-mappers";
import { MilestoneForm } from "../forms/milestone-form";

type MilestoneDialogsProps = {
  projectId: number;
  canUpdate: boolean;
  milestones: MilestoneRead[];
  createOpen: boolean;
  listOpen: boolean;
  editingMilestone: MilestoneRead | null;
  deleteTarget: MilestoneRead | null;
  onCreateOpenChange: (open: boolean) => void;
  onListOpenChange: (open: boolean) => void;
  onEditingMilestoneChange: (milestone: MilestoneRead | null) => void;
  onDeleteTargetChange: (milestone: MilestoneRead | null) => void;
};

export function MilestoneDialogs({
  projectId,
  canUpdate,
  milestones,
  createOpen,
  listOpen,
  editingMilestone,
  deleteTarget,
  onCreateOpenChange,
  onListOpenChange,
  onEditingMilestoneChange,
  onDeleteTargetChange,
}: MilestoneDialogsProps) {
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
    <>
      <Dialog open={createOpen} onOpenChange={onCreateOpenChange}>
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[min(94vw,720px)] overflow-y-auto p-6 sm:max-w-none">
          <DialogHeader>
            <DialogTitle>マイルストーン登録</DialogTitle>
            <DialogDescription>
              ガントチャートに表示するマイルストーンを追加します。
            </DialogDescription>
          </DialogHeader>
          <MilestoneForm
            mode="create"
            initialValues={defaultMilestoneFormValues}
            isPending={isCreatePending}
            error={createError}
            onSubmit={(values) =>
              createMilestone(values).then(() => onCreateOpenChange(false))
            }
          />
        </DialogContent>
      </Dialog>

      <Dialog open={listOpen} onOpenChange={onListOpenChange}>
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[min(94vw,760px)] overflow-y-auto p-6 sm:max-w-none">
          <DialogHeader>
            <DialogTitle>マイルストーン一覧</DialogTitle>
            <DialogDescription>
              ガントチャートに表示するマイルストーンを管理します。
            </DialogDescription>
          </DialogHeader>
          {milestones.length ? (
            <div className="flex flex-col gap-3">
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
                          onClick={() => {
                            onListOpenChange(false);
                            onEditingMilestoneChange(milestone);
                          }}
                        >
                          <EditIcon data-icon="inline-start" />
                          編集
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onListOpenChange(false);
                            onDeleteTargetChange(milestone);
                          }}
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
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingMilestone)}
        onOpenChange={(open) => {
          if (!open) {
            onEditingMilestoneChange(null);
            resetConflict();
          }
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[min(94vw,720px)] overflow-y-auto p-6 sm:max-w-none">
          <DialogHeader>
            <DialogTitle>マイルストーン編集</DialogTitle>
            <DialogDescription>
              {editingMilestone
                ? `${editingMilestone.title} を編集します。`
                : "マイルストーンを編集します。"}
            </DialogDescription>
          </DialogHeader>
          {editingMilestone ? (
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
                ).then(() => onEditingMilestoneChange(null));
              }}
              onSubmit={(values) =>
                updateMilestone(
                  editingMilestone.id,
                  values,
                  editingMilestone.version
                ).then(() => onEditingMilestoneChange(null))
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ResourceDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && onDeleteTargetChange(null)}
        resourceName="マイルストーン"
        isPending={isDeletePending}
        onConfirm={async () => {
          if (!deleteTarget) {
            return;
          }

          await deleteMilestone(deleteTarget.id);
          onDeleteTargetChange(null);
        }}
      />
    </>
  );
}

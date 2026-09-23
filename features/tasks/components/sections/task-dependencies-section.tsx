"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { TaskDependencyRead } from "@/lib/api/generated/model";

import { useCreateTaskDependency } from "../../hooks/use-create-task-dependency";
import { useDeleteTaskDependency } from "../../hooks/use-delete-task-dependency";
import { useTask } from "../../hooks/use-task";
import { useTaskDependencies } from "../../hooks/use-task-dependencies";
import { useUpdateTaskDependency } from "../../hooks/use-update-task-dependency";
import { TaskDependencyForm } from "../forms/task-dependency-form";
import { TaskIdentity } from "../shared/task-identity";

type TaskDependenciesSectionProps = {
  projectId: number;
  taskId: number;
  canUpdate: boolean;
};

export function TaskDependenciesSection({
  projectId,
  taskId,
  canUpdate,
}: TaskDependenciesSectionProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { dependencies, isLoading } = useTaskDependencies(taskId);
  const {
    createTaskDependency,
    isPending: isCreatePending,
    error: createError,
  } = useCreateTaskDependency(projectId, taskId);
  const { deleteTaskDependency, isPending: isDeletePending } =
    useDeleteTaskDependency(projectId, taskId);
  const { updateTaskDependency, isPending: isUpdatePending } =
    useUpdateTaskDependency(projectId, taskId);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <CardTitle>依存関係</CardTitle>
        {canUpdate ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setCreateDialogOpen(true)}
          >
            <PlusIcon data-icon="inline-start" />
            依存関係追加
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            依存関係を読み込んでいます。
          </p>
        ) : dependencies.length ? (
          <div className="flex flex-col gap-2">
            {dependencies.map((dependency) => (
              <TaskDependencyItem
                key={dependency.id}
                dependency={dependency}
                canUpdate={canUpdate}
                isDeletePending={isDeletePending}
                isUpdatePending={isUpdatePending}
                onUpdate={updateTaskDependency}
                onDelete={deleteTaskDependency}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            依存関係はありません。
          </p>
        )}
      </CardContent>
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[min(92vw,900px)] overflow-y-auto sm:max-w-none">
          <DialogHeader>
            <DialogTitle>依存関係追加</DialogTitle>
            <DialogDescription>
              作業順序に関わる依存元・依存先タスクを設定します。
            </DialogDescription>
          </DialogHeader>
          <TaskDependencyForm
            projectId={projectId}
            currentTaskId={taskId}
            isPending={isCreatePending}
            error={createError}
            onSubmit={createTaskDependency}
            onSuccess={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function TaskDependencyItem({
  dependency,
  canUpdate,
  isDeletePending,
  isUpdatePending,
  onUpdate,
  onDelete,
}: {
  dependency: TaskDependencyRead;
  canUpdate: boolean;
  isDeletePending: boolean;
  isUpdatePending: boolean;
  onUpdate: (
    dependencyId: number,
    version: number,
    lagDays: string,
  ) => Promise<unknown>;
  onDelete: (dependencyId: number) => Promise<void>;
}) {
  const [lagDays, setLagDays] = useState(String(dependency.lag_days ?? 0));
  const { task: predecessorTask } = useTask(dependency.predecessor_task_id);
  const { task: successorTask } = useTask(dependency.successor_task_id);
  const isDirty = lagDays !== String(dependency.lag_days ?? 0);
  const canSubmit = isDirty && /^\d+$/.test(lagDays);

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="text-sm">
        <TaskIdentity
          task={predecessorTask}
          fallbackTaskId={dependency.predecessor_task_id}
          className="font-medium"
          titleClassName="ml-1 text-muted-foreground"
        />
        <span className="mx-2 text-muted-foreground">完了後に</span>
        <TaskIdentity
          task={successorTask}
          fallbackTaskId={dependency.successor_task_id}
          className="font-medium"
          titleClassName="ml-1 text-muted-foreground"
        />
        <span className="ml-2 text-muted-foreground">
          を開始 / ラグ {dependency.lag_days}日
        </span>
      </div>
      {canUpdate ? (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-48 items-center gap-2">
            <Input
              inputMode="numeric"
              value={lagDays}
              aria-label="ラグ日数"
              onChange={(event) => setLagDays(event.target.value)}
            />
            <span className="text-sm text-muted-foreground">日</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canSubmit || isUpdatePending}
              onClick={() =>
                onUpdate(dependency.id, dependency.version, lagDays).catch(
                  () => undefined,
                )
              }
            >
              更新
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeletePending}
              onClick={() => onDelete(dependency.id).catch(() => undefined)}
            >
              <Trash2Icon data-icon="inline-start" />
              削除
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

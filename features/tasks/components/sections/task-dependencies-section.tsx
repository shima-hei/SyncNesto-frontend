"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { TaskDependencyRead } from "@/lib/api/generated/model";

import { useCreateTaskDependency } from "../../hooks/use-create-task-dependency";
import { useDeleteTaskDependency } from "../../hooks/use-delete-task-dependency";
import { useTask } from "../../hooks/use-task";
import { useTaskDependencies } from "../../hooks/use-task-dependencies";
import { useUpdateTaskDependency } from "../../hooks/use-update-task-dependency";
import { TaskDependencyForm } from "../forms/task-dependency-form";

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
      <CardHeader>
        <CardTitle>依存関係</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canUpdate ? (
          <TaskDependencyForm
            projectId={projectId}
            currentTaskId={taskId}
            isPending={isCreatePending}
            error={createError}
            onSubmit={createTaskDependency}
          />
        ) : null}
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
    lagDays: string
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
        <TaskDependencyLabel
          taskId={dependency.predecessor_task_id}
          taskCode={predecessorTask?.task_code}
          title={predecessorTask?.title}
        />
        <span className="mx-2 text-muted-foreground">完了後に</span>
        <TaskDependencyLabel
          taskId={dependency.successor_task_id}
          taskCode={successorTask?.task_code}
          title={successorTask?.title}
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
                  () => undefined
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

function TaskDependencyLabel({
  taskId,
  taskCode,
  title,
}: {
  taskId: number;
  taskCode?: string;
  title?: string;
}) {
  return (
    <span className="font-medium">
      {taskCode ?? `TASK-${taskId}`}
      {title ? <span className="ml-1 text-muted-foreground">{title}</span> : null}
    </span>
  );
}

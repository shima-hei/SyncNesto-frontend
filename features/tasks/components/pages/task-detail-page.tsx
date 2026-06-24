"use client";

import { useState } from "react";
import { CopyIcon, Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  canCreateTask,
  canCommentTask,
  canDeleteTask,
  canUpdateTask,
} from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { formatDate, formatDateTime } from "@/lib/format/date";
import type { TaskRead } from "@/lib/api/generated/model";

import { useDeleteTask } from "../../hooks/use-delete-task";
import { useDuplicateTask } from "../../hooks/use-duplicate-task";
import { useTask } from "../../hooks/use-task";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { useUpdateTask } from "../../hooks/use-update-task";
import { getTaskFormValues } from "../../lib/task-mappers";
import { TaskForm } from "../forms/task-form";
import { TaskDependenciesSection } from "../sections/task-dependencies-section";
import { TaskChangeLogsSection } from "../sections/task-change-logs-section";
import { TaskCommentsSection } from "../sections/task-comments-section";
import {
  TaskFlagBadges,
  TaskPriorityBadge,
  TaskRequirementBadges,
  TaskStatusBadge,
  TaskTags,
  TaskTypeBadge,
} from "../shared/task-badges";

type TaskDetailPageProps = {
  projectId: number;
  taskId: number;
};

export function TaskDetailPage({ projectId, taskId }: TaskDetailPageProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const { getTaskUserLabel } = useTaskUserMap(projectId);
  const { task, isLoading, error } = useTask(taskId);
  const { task: parentTask } = useTask(task?.parent_task_id);
  const {
    updateTask,
    conflictCurrent,
    resetConflict,
    isPending: isUpdatePending,
    error: updateError,
  } = useUpdateTask(projectId, taskId);
  const { deleteTask, isPending: isDeletePending } = useDeleteTask(
    projectId,
    taskId
  );
  const { duplicateTask, isPending: isDuplicatePending } =
    useDuplicateTask(projectId);

  if (isLoading) {
    return <TaskDetailSkeleton />;
  }

  if (error || !task) {
    return (
      <div className="p-4 text-sm text-muted-foreground lg:p-6">
        タスクを取得できませんでした。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-sm text-muted-foreground">{task.task_code}</p>
          <h2 className="truncate text-lg font-semibold">{task.title}</h2>
          <div className="flex flex-wrap gap-2">
            <TaskTypeBadge type={task.task_type} />
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
            <TaskFlagBadges
              isOverdue={task.is_overdue}
              isBlocked={task.is_blocked}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreateTask(currentProjectRole) ? (
            <Button
              type="button"
              variant="outline"
              disabled={isDuplicatePending}
              onClick={() => duplicateTask(task).catch(() => undefined)}
            >
              <CopyIcon data-icon="inline-start" />
              複製
            </Button>
          ) : null}
          {canDeleteTask(currentProjectRole) ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2Icon data-icon="inline-start" />
              削除
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TaskInfo label="担当者" value={getTaskUserLabel(task.assignee_id)} />
          <TaskInfo label="報告者" value={getTaskUserLabel(task.reporter_id)} />
          <TaskInfo label="開始日" value={formatDate(task.start_date)} />
          <TaskInfo label="終了予定日" value={formatDate(task.due_date)} />
          <TaskInfo
            label="実績開始日"
            value={formatDate(task.actual_start_date)}
          />
          <TaskInfo
            label="実績終了日"
            value={formatDate(task.actual_end_date)}
          />
          <TaskInfo label="進捗率" value={`${task.progress_percent ?? 0}%`} />
          <TaskInfo
            label="見積/実績"
            value={`${task.estimated_minutes ?? "-"} / ${
              task.actual_minutes ?? "-"
            } 分`}
          />
          <TaskInfo
            label="親タスク"
            value={getTaskReferenceLabel(parentTask, task.parent_task_id)}
          />
          <TaskInfo label="更新日時" value={formatDateTime(task.updated_at)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>関連要件・タグ</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">関連要件</span>
            <TaskRequirementBadges requirements={task.requirements} />
            {!task.requirements?.length ? (
              <span className="text-sm text-muted-foreground">関連要件はありません。</span>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">タグ</span>
            <TaskTags tags={task.tags} />
            {!task.tags?.length ? (
              <span className="text-sm text-muted-foreground">タグはありません。</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>説明</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {task.description || "説明はありません。"}
          </p>
        </CardContent>
      </Card>

      <TaskDependenciesSection
        projectId={projectId}
        taskId={taskId}
        canUpdate={canUpdateTask(currentProjectRole)}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <TaskCommentsSection
          taskId={taskId}
          canComment={canCommentTask(currentProjectRole)}
        />
        <TaskChangeLogsSection taskId={taskId} />
      </div>

      {canUpdateTask(currentProjectRole) ? (
        <Card>
          <CardHeader>
            <CardTitle>タスク編集</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskForm
              key={task.version}
              mode="update"
              projectId={projectId}
              currentTaskId={taskId}
              initialValues={getTaskFormValues(task)}
              isPending={isUpdatePending}
              error={updateError}
              conflictValues={
                conflictCurrent ? getTaskFormValues(conflictCurrent) : null
              }
              onCloseConflict={resetConflict}
              onResolveConflict={(values) => {
                if (!conflictCurrent) {
                  return Promise.resolve();
                }

                return updateTask(values, conflictCurrent.version, conflictCurrent);
              }}
              onSubmit={(values) => updateTask(values, task.version, task)}
            />
          </CardContent>
        </Card>
      ) : null}

      <ResourceDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => !open && setDeleteDialogOpen(false)}
        resourceName="タスク"
        description="タスクを削除します。削除すると元に戻せません。"
        isPending={isDeletePending}
        onConfirm={async () => {
          await deleteTask();
          setDeleteDialogOpen(false);
        }}
      />
    </div>
  );
}

function TaskInfo({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function TaskDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

const getTaskReferenceLabel = (
  task: TaskRead | null,
  fallbackTaskId?: number | null
) => {
  if (task) {
    return `${task.task_code} ${task.title}`;
  }

  return fallbackTaskId ? `タスクID: ${fallbackTaskId}` : "-";
};

"use client";
import { OverviewReturn } from "@/components/shared/navigation/overview-return";
import { RelatedSpecifications } from "@/features/specifications/components/related-specifications";
import { useListNavigation } from "@/hooks/use-list-navigation";
import { createTaskOrigin } from "@/lib/navigation/task-origin";
import { TaskRequirementLinks } from "../shared/task-requirement-links";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CopyIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
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
import {
  formatEffortMetric,
  taskPhaseLabel,
  effortBasisLabel,
} from "../../lib/task-effort";
import type { TaskRead } from "@/lib/api/generated/model";

import { useCreateTask } from "../../hooks/use-create-task";
import { useDeleteTask } from "../../hooks/use-delete-task";
import { useDuplicateTask } from "../../hooks/use-duplicate-task";
import { useTask } from "../../hooks/use-task";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { getChildTaskInitialValues } from "../../lib/task-mappers";
import { getTaskEstimateHref } from "../../lib/planning-route";
import { TaskEditableSection } from "../forms/task-editable-section";
import { TaskQuickCreate } from "../forms/task-quick-create";
import { TaskRequirementEditor } from "../forms/task-requirement-editor";
import { TaskDependenciesSection } from "../sections/task-dependencies-section";
import { TaskChangeLogsSection } from "../sections/task-change-logs-section";
import { TaskCommentsSection } from "../sections/task-comments-section";
import { TaskHierarchySection } from "../sections/task-hierarchy-section";
import { TaskTestCasesSection } from "../sections/task-test-cases-section";
import {
  TaskFlagBadges,
  TaskPriorityBadge,
  TaskStatusBadge,
  TaskTags,
  TaskTypeBadge,
} from "../shared/task-badges";

type TaskDetailPageProps = {
  projectId: number;
  taskId: number;
};

export function TaskDetailPage({ projectId, taskId }: TaskDetailPageProps) {
  const { returnTo } = useListNavigation(
    `/projects/joined/${projectId}/tasks?tab=list`,
  );
  const origin = createTaskOrigin(projectId, taskId, returnTo);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [childOpen, setChildOpen] = useState(false);
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const { getTaskUserLabel } = useTaskUserMap(projectId);
  const { task, isLoading, error } = useTask(taskId);
  const { task: parentTask } = useTask(task?.parent_task_id);
  const { deleteTask, isPending: isDeletePending } = useDeleteTask(
    projectId,
    taskId,
  );
  const {
    createTask,
    isPending: isCreatePending,
    error: createError,
  } = useCreateTask(projectId);
  const { duplicateTask, isPending: isDuplicatePending } =
    useDuplicateTask(projectId);
  const canCreate = canCreateTask(currentProjectRole);
  const canUpdate = canUpdateTask(currentProjectRole);

  if (isLoading) {
    return <TaskDetailSkeleton />;
  }

  if (error || !task) {
    return (
      <div className="text-sm text-muted-foreground">
        タスクを取得できませんでした。
      </div>
    );
  }

  return (
    <div className="@container/task-detail flex min-w-0 flex-col gap-6">
      <OverviewReturn projectId={projectId} />
      <Button asChild variant="outline" size="sm" className="w-fit">
        <Link href={returnTo}>
          <ArrowLeftIcon data-icon="inline-start" />
          タスク一覧へ戻る
        </Link>
      </Button>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <TaskEditableSection
            key={task.id}
            task={task}
            section="title"
            label="タスク名を編集"
            canUpdate={canUpdate}
          />
          <div className="text-sm text-muted-foreground">{task.task_code}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate ? (
            <Button
              type="button"
              aria-expanded={childOpen}
              onClick={() => setChildOpen(!childOpen)}
            >
              <PlusIcon data-icon="inline-start" />
              {childOpen ? "子タスク入力を閉じる" : "子タスク作成"}
            </Button>
          ) : null}
          {canCreate ? (
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
      </header>
      {childOpen && canCreate && (
        <TaskQuickCreate
          key={task.id}
          projectId={projectId}
          label="新しい子タスク"
          focusOnOpen
          initialValues={getChildTaskInitialValues(task)}
          submitTask={(values) =>
            createTask(values, { navigateAfterCreate: false })
          }
          isPending={isCreatePending}
          error={createError}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <TaskTypeBadge type={task.task_type} name={task.task_type_name} />
        <TaskEditableSection
          key={"status-" + task.id}
          task={task}
          section="status"
          label="ステータスを編集"
          canUpdate={canUpdate}
        >
          <TaskStatusBadge status={task.status} />
        </TaskEditableSection>
        <TaskEditableSection
          key={"priority-" + task.id}
          task={task}
          section="priority"
          label="優先度を編集"
          canUpdate={canUpdate}
        >
          <TaskPriorityBadge priority={task.priority} />
        </TaskEditableSection>
        <TaskFlagBadges
          isOverdue={task.is_overdue}
          isBlocked={task.is_blocked}
        />
      </div>
      <div className="grid gap-4 @min-[64rem]/task-detail:grid-cols-[minmax(0,1fr)_20rem] @min-[64rem]/task-detail:items-start @min-[80rem]/task-detail:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="@container/task-content flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>説明</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskEditableSection
                key={task.id}
                task={task}
                section="description"
                label="説明を編集"
                canUpdate={canUpdate}
              >
                <MarkdownPreview
                  value={task.description ?? ""}
                  emptyMessage="説明はありません。"
                  className="min-h-24"
                />
              </TaskEditableSection>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <TaskEditableSection
                key={task.id}
                task={task}
                section="properties"
                label="基本情報を編集"
                canUpdate={canUpdate}
              >
                <div className="grid min-w-0 gap-4 @min-[24rem]/task-content:grid-cols-2 @min-[52rem]/task-content:grid-cols-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      担当者
                    </span>
                    <TaskEditableSection
                      key={task.id}
                      task={task}
                      section="assignee"
                      label="担当者を編集"
                      canUpdate={canUpdate}
                    >
                      <span className="text-sm">
                        {getTaskUserLabel(task.assignee_id)}
                      </span>
                    </TaskEditableSection>
                  </div>
                  <TaskInfo
                    label="報告者"
                    value={getTaskUserLabel(task.reporter_id)}
                  />
                  <TaskInfo
                    label="開始日"
                    value={formatDate(task.start_date)}
                  />
                  <TaskInfo
                    label="終了予定日"
                    value={formatDate(task.due_date)}
                  />
                  <TaskInfo
                    label="進捗率"
                    value={`${task.progress_percent ?? 0}%`}
                  />
                  <TaskInfo
                    label="親タスク"
                    value={getTaskReferenceLabel(
                      parentTask,
                      task.parent_task_id,
                    )}
                  />
                  <TaskInfo
                    label="登録日時"
                    value={
                      <time dateTime={task.created_at}>
                        {formatDateTime(task.created_at)}
                      </time>
                    }
                  />
                  <TaskInfo
                    label="更新日時"
                    value={formatDateTime(task.updated_at)}
                  />
                  <TaskInfo
                    label="タグ"
                    value={
                      task.tags?.length ? (
                        <TaskTags tags={task.tags} />
                      ) : (
                        "未設定"
                      )
                    }
                  />
                </div>
              </TaskEditableSection>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>工程・見積</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <TaskInfo label="工程所属" value={taskPhaseLabel(task)} />
                <TaskInfo
                  label="見積工数"
                  value={
                    task.estimated_minutes == null
                      ? "未入力"
                      : task.estimated_minutes + " 分"
                  }
                />
                <TaskInfo
                  label="子を含む見積"
                  value={formatEffortMetric(task.effort_totals?.estimated)}
                />
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={getTaskEstimateHref(projectId, task.id)}>
                  {canUpdate ? "見積を入力" : "見積を確認"}
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>実績記録</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <TaskEditableSection
                key={task.id}
                task={task}
                section="actual"
                label="実績を編集"
                canUpdate={canUpdate}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <TaskInfo
                    label="実績工数"
                    value={
                      task.actual_minutes == null
                        ? "未入力"
                        : task.actual_minutes + " 分"
                    }
                  />
                  <TaskInfo
                    label="集計根拠"
                    value={effortBasisLabel(task.actual_basis)}
                  />
                  <TaskInfo
                    label="子を含む実績"
                    value={formatEffortMetric(task.effort_totals?.actual)}
                  />
                  <TaskInfo
                    label="実績開始日"
                    value={formatDate(task.actual_start_date)}
                  />
                  <TaskInfo
                    label="実績終了日"
                    value={formatDate(task.actual_end_date)}
                  />
                </div>
              </TaskEditableSection>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>関連要件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {task.requirements?.length ? (
                <TaskRequirementLinks
                  requirements={task.requirements}
                  origin={origin}
                />
              ) : (
                <span className="text-sm text-muted-foreground">
                  関連要件はありません。
                </span>
              )}
              {canUpdate && <TaskRequirementEditor key={task.id} task={task} />}
            </CardContent>
          </Card>
          {task.task_type === "bug" && (
            <TaskTestCasesSection projectId={projectId} taskId={taskId} />
          )}

          <TaskHierarchySection
            projectId={projectId}
            task={task}
            parentTask={parentTask}
          />

          <TaskDependenciesSection
            projectId={projectId}
            taskId={taskId}
            canUpdate={canUpdate}
          />

          <TaskChangeLogsSection taskId={taskId} />
          <RelatedSpecifications
            projectId={projectId}
            origin={origin}
            targetType="task"
            targetId={String(taskId)}
          />
        </div>

        <aside className="min-w-0 @min-[64rem]/task-detail:sticky @min-[64rem]/task-detail:top-20">
          <TaskCommentsSection
            projectId={projectId}
            task={task}
            taskId={taskId}
            canComment={canCommentTask(currentProjectRole)}
            canUpdateStatus={canUpdate}
            className="@min-[64rem]/task-detail:max-h-[calc(100dvh-6rem)] @min-[64rem]/task-detail:overflow-hidden"
            contentClassName="@min-[64rem]/task-detail:max-h-none @min-[64rem]/task-detail:min-h-0 @min-[64rem]/task-detail:overflow-y-auto @min-[64rem]/task-detail:overscroll-contain"
          />
        </aside>
      </div>

      <ResourceDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => !open && setDeleteDialogOpen(false)}
        resourceName="タスク"
        description="タスクを削除します。保持期限内はごみ箱から復元できます。"
        isPending={isDeletePending}
        onConfirm={async () => {
          await deleteTask();
          setDeleteDialogOpen(false);
        }}
      />
    </div>
  );
}

function TaskInfo({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm break-words [overflow-wrap:anywhere]">
        {value}
      </span>
    </div>
  );
}

function TaskDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

const getTaskReferenceLabel = (
  task: TaskRead | null,
  fallbackTaskId?: number | null,
) => {
  if (task) {
    return `${task.task_code} ${task.title}`;
  }

  return fallbackTaskId ? `タスクID: ${fallbackTaskId}` : "-";
};

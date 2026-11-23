"use client";
import { OverviewReturn } from "@/components/shared/navigation/overview-return";
import { RelatedSpecifications } from "@/features/specifications/components/related-specifications";
import { useListNavigation } from "@/hooks/use-list-navigation";
import { createTaskOrigin } from "@/lib/navigation/task-origin";
import { TaskRequirementLinks } from "../shared/task-requirement-links";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { readTaskCreateReturn } from "../../lib/task-create-route";
import {
  getTaskPriorityLabel,
  getTaskTypeLabel,
} from "../../constants/task-options";
import type { TaskEditSection } from "../../lib/task-mappers";
import { TaskPhaseCell } from "../shared/task-phase-cell";
import { usePlanningPhases } from "../../hooks/use-planning-phases";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CopyIcon,
  EllipsisIcon,
  Trash2Icon,
} from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  canCreateTask,
  canCommentTask,
  canDeleteTask,
  canUpdateTask,
} from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { formatEffortMetric, effortBasisLabel } from "../../lib/task-effort";
import type { TaskRead } from "@/lib/api/generated/model";

import { useDeleteTask } from "../../hooks/use-delete-task";
import { useDuplicateTask } from "../../hooks/use-duplicate-task";
import { useTask } from "../../hooks/use-task";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { getTaskEstimateHref } from "../../lib/planning-route";
import { TaskEditableSection } from "../forms/task-editable-section";
import { TaskAssignee } from "../shared/task-assignee";
import { TaskRequirementEditor } from "../forms/task-requirement-editor";
import { TaskDependenciesSection } from "../sections/task-dependencies-section";
import { TaskChangeLogsSection } from "../sections/task-change-logs-section";
import { TaskCommentsSection } from "../sections/task-comments-section";
import { TaskHierarchySection } from "../sections/task-hierarchy-section";
import { TaskTestCasesSection } from "../sections/task-test-cases-section";
import {
  TaskFlagBadges,
  TaskStatusBadge,
  TaskTags,
} from "../shared/task-badges";

type TaskDetailPageProps = {
  projectId: number;
  taskId: number;
};

export function TaskDetailPage({ projectId, taskId }: TaskDetailPageProps) {
  const { returnTo } = useListNavigation(
    `/projects/joined/${projectId}/tasks?tab=list`,
  );
  const params = useSearchParams();
  const createReturn = readTaskCreateReturn(
    projectId,
    params.get("createReturn"),
  );
  const [activity, setActivity] = useState("comments");
  const phases = usePlanningPhases(projectId);
  const origin = createTaskOrigin(projectId, taskId, returnTo);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const { getTaskUserLabel, usersById } = useTaskUserMap(projectId);
  const { task, isLoading, error } = useTask(taskId);
  const { task: parentTask } = useTask(task?.parent_task_id);
  const { deleteTask, isPending: isDeletePending } = useDeleteTask(
    projectId,
    taskId,
  );
  const { duplicateTask, isPending: isDuplicatePending } =
    useDuplicateTask(projectId);
  const canCreate = canCreateTask(currentProjectRole);
  const canUpdate = canUpdateTask(currentProjectRole);

  if (isLoading) {
    return <TaskDetailSkeleton />;
  }

  if (error || !task || task.project_id !== projectId) {
    return (
      <div className="text-sm text-muted-foreground">
        タスクを取得できませんでした。
      </div>
    );
  }

  const canDelete = canDeleteTask(currentProjectRole);
  const edit = (section: TaskEditSection, label: string, value?: ReactNode) => (
    <TaskEditableSection
      task={task}
      section={section}
      label={label}
      canUpdate={canUpdate}
    >
      {value}
    </TaskEditableSection>
  );
  const properties = (
    <>
      <TaskProperty label="ステータス">
        {edit(
          "status",
          "ステータスを編集",
          <TaskStatusBadge status={task.status} />,
        )}
      </TaskProperty>
      <TaskProperty label="担当者">
        {edit(
          "assignee",
          "担当者を編集",
          <TaskAssignee
            userId={task.assignee_id}
            user={
              task.assignee_id ? usersById.get(task.assignee_id) : undefined
            }
          />,
        )}
      </TaskProperty>
      <TaskProperty label="優先度">
        {edit("priority", "優先度を編集", getTaskPriorityLabel(task.priority))}
      </TaskProperty>
      <TaskProperty label="種別">
        {edit(
          "type",
          "種別を編集",
          getTaskTypeLabel(task.task_type, task.task_type_name),
        )}
      </TaskProperty>
      <TaskProperty label="工程">
        <TaskPhaseCell
          task={task}
          quiet
          phases={phases.data ?? []}
          editable={canUpdate && phases.isSuccess}
        />
      </TaskProperty>
      <TaskProperty label="開始日">
        {edit("startDate", "開始日を編集", formatDate(task.start_date))}
      </TaskProperty>
      <TaskProperty label="終了予定日">
        {edit("dueDate", "終了予定日を編集", formatDate(task.due_date))}
      </TaskProperty>
      <TaskProperty label="親タスク">
        {task.parent_task_id ? (
          <Link
            className="break-words underline-offset-4 hover:underline"
            href={`/projects/joined/${projectId}/tasks/${task.parent_task_id}`}
          >
            {getTaskReferenceLabel(parentTask, task.parent_task_id)}
          </Link>
        ) : (
          "なし"
        )}
      </TaskProperty>
      <TaskProperty label="進捗率">
        {edit("progress", "進捗率を編集", `${task.progress_percent ?? 0}%`)}
      </TaskProperty>
      <TaskProperty label="タグ">
        {task.tags?.length ? <TaskTags tags={task.tags} /> : "未設定"}
      </TaskProperty>
    </>
  );
  return (
    <div
      key={task.id}
      className="@container/task-detail flex min-w-0 flex-col gap-4"
    >
      <OverviewReturn projectId={projectId} />
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={createReturn ?? returnTo}>
          <ArrowLeftIcon aria-hidden />
          {createReturn ? "起票元へ戻る" : "タスク一覧へ戻る"}
        </Link>
      </Button>
      <header className="flex items-start justify-between gap-3 border-b pb-4">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium tabular-nums text-muted-foreground">
            {task.task_code}
          </p>
          {edit("title", "タスク名を編集")}
          <TaskFlagBadges
            isOverdue={task.is_overdue}
            isBlocked={task.is_blocked}
          />
        </div>
        {(canCreate || canDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon-sm"
                variant="outline"
                aria-label="タスクの操作"
              >
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canCreate && (
                <DropdownMenuItem
                  disabled={isDuplicatePending}
                  onSelect={() =>
                    void duplicateTask(task).catch(() => undefined)
                  }
                >
                  <CopyIcon />
                  複製
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setDeleteDialogOpen(true)}
                >
                  <Trash2Icon />
                  削除
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      <div className="grid min-w-0 items-start gap-x-8 gap-y-5 @min-[57rem]/task-detail:grid-cols-[minmax(0,1fr)_19rem] @min-[57rem]/task-detail:grid-rows-[max-content_1fr] @min-[74rem]/task-detail:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0 space-y-4">
          <section className="min-w-0 space-y-2">
            <TaskEditableSection
              task={task}
              section="description"
              heading="説明"
              label="説明を編集"
              canUpdate={canUpdate}
            >
              <MarkdownPreview
                value={task.description ?? ""}
                emptyMessage="説明はありません。"
                className="min-h-0 min-w-0 rounded-none border-0 bg-transparent p-0"
              />
            </TaskEditableSection>
          </section>
          <TaskHierarchySection
            key={task.id}
            projectId={projectId}
            task={task}
            canCreate={canCreate}
          />
        </div>

        <aside
          aria-label="プロパティと工数"
          className="min-w-0 space-y-5 border-y py-4 @min-[57rem]/task-detail:col-start-2 @min-[57rem]/task-detail:row-span-2 @min-[57rem]/task-detail:row-start-1 @min-[57rem]/task-detail:border-y-0 @min-[57rem]/task-detail:border-l @min-[57rem]/task-detail:py-0 @min-[57rem]/task-detail:pl-5"
        >
          <section className="space-y-2">
            <TaskEditableSection
              task={task}
              section="properties"
              heading="プロパティ"
              label="プロパティを編集"
              canUpdate={canUpdate}
            >
              <dl>{properties}</dl>
            </TaskEditableSection>
          </section>
          <section className="space-y-2 border-t pt-4">
            <div className="flex min-h-7 items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">見積</h2>
              <Button
                asChild
                size="icon-sm"
                variant="ghost"
                className="shrink-0 text-muted-foreground"
              >
                <Link
                  href={getTaskEstimateHref(projectId, task.id)}
                  aria-label={canUpdate ? "見積を入力" : "見積を確認"}
                  title={canUpdate ? "見積を入力" : "見積を確認"}
                >
                  <ArrowUpRightIcon aria-hidden />
                </Link>
              </Button>
            </div>
            <dl>
              <TaskProperty label="見積工数">
                {formatMinutes(task.estimated_minutes)}
              </TaskProperty>
              <TaskProperty label="見積の根拠">
                {effortBasisLabel(task.estimated_basis)}
              </TaskProperty>
              <TaskProperty label="子を含む見積">
                {formatEffortMetric(task.effort_totals?.estimated)}
              </TaskProperty>
            </dl>
          </section>
          <section className="space-y-2 border-t pt-4">
            <TaskEditableSection
              task={task}
              section="actual"
              heading="実績"
              label="実績を編集"
              canUpdate={canUpdate}
            >
              <dl>
                <TaskProperty label="実績工数">
                  {formatMinutes(task.actual_minutes)}
                </TaskProperty>
                <TaskProperty label="実績の根拠">
                  {effortBasisLabel(task.actual_basis)}
                </TaskProperty>
                <TaskProperty label="子を含む実績">
                  {formatEffortMetric(task.effort_totals?.actual)}
                </TaskProperty>
                <TaskProperty label="実績開始日">
                  {formatDate(task.actual_start_date)}
                </TaskProperty>
                <TaskProperty label="実績終了日">
                  {formatDate(task.actual_end_date)}
                </TaskProperty>
              </dl>
            </TaskEditableSection>
          </section>
          <details className="border-t pt-3 text-sm">
            <summary className="cursor-pointer font-medium">管理情報</summary>
            <dl className="mt-2">
              <TaskProperty label="報告者">
                {edit(
                  "reporter",
                  "報告者を編集",
                  task.reporter_id
                    ? getTaskUserLabel(task.reporter_id)
                    : "未設定",
                )}
              </TaskProperty>
              <TaskProperty label="登録日時">
                <time dateTime={task.created_at}>
                  {formatDateTime(task.created_at)}
                </time>
              </TaskProperty>
              <TaskProperty label="更新日時">
                <time dateTime={task.updated_at}>
                  {formatDateTime(task.updated_at)}
                </time>
              </TaskProperty>
              <TaskProperty label="並び順">{task.sort_order ?? 0}</TaskProperty>
            </dl>
          </details>
        </aside>

        <div className="min-w-0 space-y-5 @min-[57rem]/task-detail:col-start-1 @min-[57rem]/task-detail:row-start-2">
          <section className="space-y-2 border-t pt-4">
            <h2 className="text-sm font-semibold">関連要件</h2>
            {task.requirements?.length ? (
              <TaskRequirementLinks
                requirements={task.requirements}
                origin={origin}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                関連要件はありません。
              </p>
            )}
            {canUpdate && <TaskRequirementEditor key={task.id} task={task} />}
          </section>
          <TaskDependenciesSection
            projectId={projectId}
            taskId={taskId}
            canUpdate={canUpdate}
          />
          <RelatedSpecifications
            projectId={projectId}
            origin={origin}
            targetType="task"
            targetId={String(taskId)}
          />
          {task.task_type === "bug" && (
            <TaskTestCasesSection projectId={projectId} taskId={taskId} />
          )}

          <section
            aria-label="アクティビティ"
            className="space-y-2 border-t pt-4"
          >
            <h2 className="text-sm font-semibold">アクティビティ</h2>
            <Tabs value={activity} onValueChange={setActivity}>
              <TabsList variant="line" className="justify-start border-b">
                <TabsTrigger value="comments">コメント</TabsTrigger>
                <TabsTrigger value="history">変更履歴</TabsTrigger>
              </TabsList>
              <TabsContent
                value="comments"
                forceMount
                hidden={activity !== "comments"}
                className="pt-2"
              >
                <TaskCommentsSection
                  projectId={projectId}
                  task={task}
                  taskId={taskId}
                  canComment={canCommentTask(currentProjectRole)}
                  canUpdateStatus={canUpdate}
                  embedded
                />
              </TabsContent>
              <TabsContent value="history" className="pt-2">
                <TaskChangeLogsSection taskId={taskId} />
              </TabsContent>
            </Tabs>
          </section>
        </div>
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

function TaskProperty({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[6.25rem_minmax(0,1fr)] items-baseline gap-2 py-1 text-sm">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

const formatMinutes = (value: number | null | undefined) =>
  value == null ? "未入力" : `${value} 分`;

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

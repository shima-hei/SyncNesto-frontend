"use client";

import { useUrlFilterState } from "@/hooks/use-url-filter-state";

import { useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { LoadingState } from "@/components/shared/feedback/loading-state";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { OverviewReturn } from "@/components/shared/navigation/overview-return";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FieldGroup } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  canCreateTask,
  canUpdateTask,
} from "@/features/auth/utils/authorization";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { useUrlTabState } from "@/hooks/use-url-tab-state";
import type { MilestoneRead } from "@/lib/api/generated/model";

import {
  ALL_OVERDUE,
  ALL_PRIORITIES,
  ALL_STATUSES,
  ALL_TYPES,
  GANTT_DISPLAY_OPTIONS,
  GanttControls,
  NO_BULK_STATUS_CHANGE,
  SORT_OPTIONS,
  TaskBoardToolbar,
  TaskBulkActions,
  TaskFilters,
} from "./parts/task-page-controls";
import { useBulkUpdateTasks } from "../../hooks/use-bulk-update-tasks";
import { useCreateTask } from "../../hooks/use-create-task";
import { useGantt } from "../../hooks/use-gantt";
import { useMilestones } from "../../hooks/use-milestones";
import { useTasks } from "../../hooks/use-tasks";
import { defaultTaskFormValues } from "../../lib/task-mappers";
import { BOARD_TASK_LIMIT, getBoardTaskScope } from "../../lib/task-view-scope";
import { TASK_STATUS_OPTIONS } from "../../constants/task-options";
import { TaskForm } from "../forms/task-form";
import { TaskUserSelectField } from "../forms/task-user-select-field";
import { TaskRequirementSelectField } from "../forms/task-requirement-select-field";
import { MilestoneDialogs } from "../sections/milestone-dialogs";
import {
  type BoardSwimlane,
  TasksBoardSection,
} from "../sections/tasks-board-section";
import { TasksGanttSection } from "../sections/tasks-gantt-section";
import { TasksTable } from "../tables/tasks-table";
import { TaskPhaseDialog } from "../sections/task-phase-dialog";

const PAGE_SIZE = 20;
const TASK_TABS = ["list", "board", "gantt"] as const;

type TasksPageProps = {
  projectId: number;
};

export function TasksPage({ projectId }: TasksPageProps) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useUrlTabState({
    values: TASK_TABS,
    defaultValue: "list",
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [page, setPage] = useUrlFilterState("page", 1);
  const [q, setQ] = useUrlFilterState("q", "");
  const [searchInput, setSearchInput] = useState(q);
  const [status, setStatus] = useUrlFilterState("status", ALL_STATUSES);
  const [priority, setPriority] = useUrlFilterState("priority", ALL_PRIORITIES);
  const [taskType, setTaskType] = useUrlFilterState("taskType", ALL_TYPES);
  const [overdue, setOverdue] = useUrlFilterState("overdue", ALL_OVERDUE);
  const [assigneeId, setAssigneeId] = useUrlFilterState(
    "assigneeId",
    searchParams.get("ganttAssigneeId") ??
      (searchParams.get("assignee") === "me" ? String(user?.id ?? "") : ""),
  );
  const [requirementId, setRequirementId] = useUrlFilterState(
    "requirementId",
    searchParams.get("ganttRequirementId") ?? "",
  );
  const [tag, setTag] = useUrlFilterState("tag", "");
  const [startDateFrom, setStartDateFrom] = useUrlFilterState(
    "startDateFrom",
    "",
  );
  const [dueDateTo, setDueDateTo] = useUrlFilterState("dueDateTo", "");
  const [sort, setSort] = useUrlFilterState<
    (typeof SORT_OPTIONS)[number]["value"]
  >("sort", "updated_desc");
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState(NO_BULK_STATUS_CHANGE);
  const [bulkAssigneeId, setBulkAssigneeId] = useState("");
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [ganttStartDate, setGanttStartDate] = useUrlFilterState(
    "ganttStartDate",
    "",
  );
  const [ganttEndDate, setGanttEndDate] = useUrlFilterState("ganttEndDate", "");
  const [ganttDisplayUnit, setGanttDisplayUnit] = useUrlFilterState<
    (typeof GANTT_DISPLAY_OPTIONS)[number]["value"]
  >("ganttDisplayUnit", "day");
  const [boardSwimlane, setBoardSwimlane] = useUrlFilterState<BoardSwimlane>(
    "boardSwimlane",
    "none",
  );
  const [boardCompleted, setBoardCompleted] = useUrlFilterState(
    "boardCompleted",
    "collapsed",
  );
  const isBoardCompletedCollapsed = boardCompleted !== "expanded";
  const [milestoneCreateDialogOpen, setMilestoneCreateDialogOpen] =
    useState(false);
  const [milestoneListDialogOpen, setMilestoneListDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] =
    useState<MilestoneRead | null>(null);
  const [deleteMilestoneTarget, setDeleteMilestoneTarget] =
    useState<MilestoneRead | null>(null);
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const canCreate = canCreateTask(currentProjectRole);
  const canUpdate = canUpdateTask(currentProjectRole);
  const {
    tasks,
    total,
    isLoading,
    isFetching,
    isPlaceholderData,
    error,
    refetch,
  } = useTasks(
    projectId,
    {
      page: activeTab === "board" ? 1 : page,
      page_size: activeTab === "board" ? BOARD_TASK_LIMIT : PAGE_SIZE,
      q: q || undefined,
      status: status === ALL_STATUSES ? undefined : status,
      task_type: taskType === ALL_TYPES ? undefined : taskType,
      priority: priority === ALL_PRIORITIES ? undefined : priority,
      assignee_id: assigneeId ? Number(assigneeId) : undefined,
      requirement_id: requirementId ? Number(requirementId) : undefined,
      tag: tag.trim() || undefined,
      start_date_from: startDateFrom || undefined,
      due_date_to: dueDateTo || undefined,
      overdue: overdue === ALL_OVERDUE ? undefined : overdue === "overdue",
      sort,
    },
    activeTab !== "gantt" &&
      (searchParams.get("assignee") !== "me" || Boolean(user)),
  );
  const {
    gantt,
    isLoading: isGanttLoading,
    isFetching: isGanttFetching,
    isPlaceholderData: isGanttPlaceholder,
    error: ganttError,
    refetch: refetchGantt,
  } = useGantt(
    projectId,
    {
      start_date: ganttStartDate || undefined,
      end_date: ganttEndDate || undefined,
      assignee_id: assigneeId ? Number(assigneeId) : undefined,
      requirement_id: requirementId ? Number(requirementId) : undefined,
    },
    activeTab === "gantt",
  );
  const boardScope = getBoardTaskScope(
    tasks,
    total,
    isBoardCompletedCollapsed,
    TASK_STATUS_OPTIONS.map((option) => option.value),
  );
  const currentGantt = isGanttPlaceholder || ganttError ? null : gantt;
  const ganttUnscheduled =
    currentGantt?.tasks.filter((task) => !task.start_date && !task.due_date)
      .length ?? 0;
  const { milestones } = useMilestones(projectId);
  const {
    createTask,
    isPending: isCreatePending,
    error: createError,
  } = useCreateTask(projectId);
  const { bulkUpdateTasks, isPending: isBulkUpdatePending } =
    useBulkUpdateTasks(projectId);
  const selectedTasks = useMemo(() => {
    return tasks.filter((task) => selectedTaskIds.includes(task.id));
  }, [selectedTaskIds, tasks]);
  const hasBulkChange =
    bulkStatus !== NO_BULK_STATUS_CHANGE ||
    Boolean(bulkAssigneeId || bulkDueDate);

  const handleSearch = () => {
    setPage(1);
    setQ(searchInput.trim());
  };

  const handleToggleTask = (taskId: number, checked: boolean) => {
    setSelectedTaskIds((current) => {
      if (checked) {
        return current.includes(taskId) ? current : [...current, taskId];
      }

      return current.filter((currentTaskId) => currentTaskId !== taskId);
    });
  };

  const handleToggleAllTasks = (checked: boolean) => {
    if (!checked) {
      setSelectedTaskIds((current) =>
        current.filter((taskId) => !tasks.some((task) => task.id === taskId)),
      );
      return;
    }

    setSelectedTaskIds((current) =>
      Array.from(new Set([...current, ...tasks.map((task) => task.id)])),
    );
  };

  const handleBulkUpdate = async () => {
    await bulkUpdateTasks(selectedTasks, {
      status: bulkStatus === NO_BULK_STATUS_CHANGE ? undefined : bulkStatus,
      assigneeId: bulkAssigneeId || undefined,
      dueDate: bulkDueDate || undefined,
    });
    setSelectedTaskIds([]);
    setBulkStatus(NO_BULK_STATUS_CHANGE);
    setBulkAssigneeId("");
    setBulkDueDate("");
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <OverviewReturn projectId={projectId} />
      <PageHeader
        title="タスク"
        description="プロジェクトのタスク、カンバン、ガントチャートを管理します。"
        actions={
          <div className="flex flex-wrap gap-2">
            <TaskPhaseDialog projectId={projectId} />
            {canCreate ? (
              <Button type="button" onClick={() => setCreateDialogOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                タスク新規作成
              </Button>
            ) : null}
          </div>
        }
      />

      <section
        aria-label="すべての表示の共通条件"
        className="flex flex-col gap-2"
      >
        <p className="text-sm text-muted-foreground">
          担当者・関連要件は、一覧・ボード・ガントに共通で適用します。
        </p>
        <FieldGroup className="grid gap-3 md:grid-cols-2">
          <TaskUserSelectField
            projectId={projectId}
            label="担当者"
            value={assigneeId}
            placeholder="すべて"
            onChange={(value) => {
              setPage(1);
              setAssigneeId(value);
            }}
          />
          <TaskRequirementSelectField
            projectId={projectId}
            value={requirementId}
            placeholder="すべて"
            onChange={(value) => {
              setPage(1);
              setRequirementId(value);
            }}
          />
        </FieldGroup>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList
          variant="line"
          className="flex h-auto w-full flex-wrap justify-start border-b"
        >
          <TabsTrigger value="list">一覧</TabsTrigger>
          <TabsTrigger value="board">ボード</TabsTrigger>
          <TabsTrigger value="gantt">ガント</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            以下の条件は一覧・ボードに共通です。日付は開始日以降・終了予定日以前で絞り込みます。
          </p>
          <TaskFilters
            searchInput={searchInput}
            status={status}
            priority={priority}
            taskType={taskType}
            overdue={overdue}
            tag={tag}
            startDateFrom={startDateFrom}
            dueDateTo={dueDateTo}
            sort={sort}
            onSearchInputChange={setSearchInput}
            onSearch={handleSearch}
            onStatusChange={(value) => {
              setPage(1);
              setStatus(value);
            }}
            onPriorityChange={(value) => {
              setPage(1);
              setPriority(value);
            }}
            onTaskTypeChange={(value) => {
              setPage(1);
              setTaskType(value);
            }}
            onTagChange={(value) => {
              setPage(1);
              setTag(value);
            }}
            onStartDateFromChange={(value) => {
              setPage(1);
              setStartDateFrom(value);
            }}
            onDueDateToChange={(value) => {
              setPage(1);
              setDueDateTo(value);
            }}
            onOverdueChange={(value) => {
              setPage(1);
              setOverdue(value);
            }}
            onSortChange={(value) => setSort(value as typeof sort)}
          />
          {canUpdate ? (
            <TaskBulkActions
              projectId={projectId}
              selectedCount={selectedTasks.length}
              status={bulkStatus}
              assigneeId={bulkAssigneeId}
              dueDate={bulkDueDate}
              isPending={isBulkUpdatePending}
              disabled={!selectedTasks.length || !hasBulkChange}
              onStatusChange={setBulkStatus}
              onAssigneeIdChange={setBulkAssigneeId}
              onDueDateChange={setBulkDueDate}
              onApply={handleBulkUpdate}
              onClearSelection={() => setSelectedTaskIds([])}
            />
          ) : null}
          {error && !isLoading ? (
            <DataLoadError
              resourceName="タスク"
              isRetrying={isFetching}
              onRetry={() => void refetch()}
            />
          ) : (
            <>
              <p role="status" className="text-sm text-muted-foreground">
                {isLoading
                  ? "タスクを読み込んでいます。"
                  : isPlaceholderData
                    ? "条件を更新中です。直前の結果を表示しています。"
                    : total
                      ? tasks.length
                        ? `条件に合う全${total}件中 ${(page - 1) * PAGE_SIZE + 1}〜${Math.min((page - 1) * PAGE_SIZE + tasks.length, total)}件（1ページ${PAGE_SIZE}件）`
                        : `条件に合う全${total}件。このページの対象は0件です。`
                      : "条件に合うタスクは0件です。"}
              </p>
              <TasksTable
                projectId={projectId}
                tasks={tasks}
                isLoading={isLoading}
                canCreate={canCreate}
                canUpdate={canUpdate}
                selectedTaskIds={selectedTaskIds}
                onToggleTask={handleToggleTask}
                onToggleAllTasks={handleToggleAllTasks}
              />
              <DataPagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                currentCount={tasks.length}
                isFetching={isFetching}
                isLoading={isLoading}
                onPageChange={setPage}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="board" className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            以下の条件は一覧・ボードに共通です。ボードは条件に合う100件までを全件表示します。
          </p>
          <TaskBoardToolbar
            searchInput={searchInput}
            status={status}
            priority={priority}
            taskType={taskType}
            overdue={overdue}
            tag={tag}
            startDateFrom={startDateFrom}
            dueDateTo={dueDateTo}
            sort={sort}
            onSearchInputChange={setSearchInput}
            onSearch={handleSearch}
            onStatusChange={(value) => {
              setPage(1);
              setStatus(value);
            }}
            onPriorityChange={(value) => {
              setPage(1);
              setPriority(value);
            }}
            onTaskTypeChange={(value) => {
              setPage(1);
              setTaskType(value);
            }}
            onTagChange={(value) => {
              setPage(1);
              setTag(value);
            }}
            onStartDateFromChange={(value) => {
              setPage(1);
              setStartDateFrom(value);
            }}
            onDueDateToChange={(value) => {
              setPage(1);
              setDueDateTo(value);
            }}
            onOverdueChange={(value) => {
              setPage(1);
              setOverdue(value);
            }}
            onSortChange={(value) => setSort(value as typeof sort)}
            swimlane={boardSwimlane}
            isCompletedCollapsed={isBoardCompletedCollapsed}
            onSwimlaneChange={(value) => setBoardSwimlane(value)}
            onCompletedCollapsedChange={(collapsed) =>
              setBoardCompleted(collapsed ? "collapsed" : "expanded")
            }
          />
          {error ? (
            <DataLoadError
              resourceName="ボードのタスク"
              isRetrying={isFetching}
              onRetry={() => void refetch()}
            />
          ) : isLoading || isPlaceholderData ? (
            <LoadingState message="ボードの対象範囲を確認しています。" />
          ) : boardScope.overLimit ? (
            <Alert>
              <AlertTitle>
                条件に合う全{total}件は、表示上限100件を超えています
              </AlertTitle>
              <AlertDescription>
                <p>条件を絞り込むか、一覧で確認してください。</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("list")}
                >
                  一覧で確認
                </Button>
              </AlertDescription>
            </Alert>
          ) : !boardScope.complete ? (
            <DataLoadError
              resourceName="ボードの表示範囲"
              isRetrying={isFetching}
              onRetry={() => void refetch()}
            />
          ) : (
            <>
              <p role="status" className="text-sm text-muted-foreground">
                条件に合う全{total}件 · カード表示{boardScope.visible}件
                {boardScope.folded
                  ? ` · 完了・中止${boardScope.folded}件を折り畳み`
                  : ""}
                {boardScope.unknown
                  ? ` · 表示列のない状態${boardScope.unknown}件（一覧で確認）`
                  : ""}
                {isFetching ? " · 更新中" : ""}
              </p>
              <TasksBoardSection
                projectId={projectId}
                tasks={tasks}
                canUpdate={canUpdate}
                swimlane={boardSwimlane}
                isCompletedCollapsed={isBoardCompletedCollapsed}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="gantt" className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            ガント固有の期間条件：期間に重なるタスクと日程未設定を取得します。一覧・ボードのキーワード・状態・優先度・タグ・期限条件は適用されません。
          </p>
          <GanttControls
            canUpdate={canUpdate}
            startDate={ganttStartDate}
            endDate={ganttEndDate}
            displayUnit={ganttDisplayUnit}
            gantt={currentGantt}
            milestones={milestones}
            onStartDateChange={setGanttStartDate}
            onEndDateChange={setGanttEndDate}
            onDisplayUnitChange={(value) =>
              setGanttDisplayUnit(value as typeof ganttDisplayUnit)
            }
            onOpenMilestoneList={() => setMilestoneListDialogOpen(true)}
            onOpenMilestoneCreate={() => setMilestoneCreateDialogOpen(true)}
          />
          <p className="text-sm text-muted-foreground">
            対象期間：{ganttStartDate || "開始の制限なし"} 〜{" "}
            {ganttEndDate || "終了の制限なし"}（日程未設定を含む）
          </p>
          {ganttError ? (
            <DataLoadError
              resourceName="ガント"
              isRetrying={isGanttFetching}
              onRetry={() => void refetchGantt()}
            />
          ) : (
            <>
              {currentGantt ? (
                <p role="status" className="text-sm text-muted-foreground">
                  共通条件・期間条件に合う取得{currentGantt.tasks.length}
                  件（日程あり{currentGantt.tasks.length - ganttUnscheduled}
                  件・日程未設定{ganttUnscheduled}件）
                  {isGanttFetching ? " · 更新中" : ""}
                </p>
              ) : null}
              <TasksGanttSection
                projectId={projectId}
                gantt={currentGantt}
                isLoading={isGanttLoading || isGanttPlaceholder}
                displayUnit={ganttDisplayUnit}
                canUpdate={canUpdate}
                onMilestoneSelect={setEditingMilestone}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[min(94vw,960px)] overflow-y-auto p-6 sm:max-w-none">
          <DialogHeader>
            <DialogTitle>タスク登録</DialogTitle>
            <DialogDescription>
              プロジェクトに新しいタスクを追加します。
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            mode="create"
            projectId={projectId}
            initialValues={defaultTaskFormValues}
            isPending={isCreatePending}
            error={createError}
            onSubmit={createTask}
            onSuccess={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <MilestoneDialogs
        projectId={projectId}
        canUpdate={canUpdate}
        milestones={milestones}
        createOpen={milestoneCreateDialogOpen}
        listOpen={milestoneListDialogOpen}
        editingMilestone={editingMilestone}
        deleteTarget={deleteMilestoneTarget}
        onCreateOpenChange={setMilestoneCreateDialogOpen}
        onListOpenChange={setMilestoneListDialogOpen}
        onEditingMilestoneChange={setEditingMilestone}
        onDeleteTargetChange={setDeleteMilestoneTarget}
      />
    </div>
  );
}

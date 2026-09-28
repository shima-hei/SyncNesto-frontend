"use client";

import { useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Button } from "@/components/ui/button";
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
import { TaskForm } from "../forms/task-form";
import { MilestoneDialogs } from "../sections/milestone-dialogs";
import {
  type BoardSwimlane,
  TasksBoardSection,
} from "../sections/tasks-board-section";
import { TasksGanttSection } from "../sections/tasks-gantt-section";
import { TasksTable } from "../tables/tasks-table";

const PAGE_SIZE = 20;
const TASK_TABS = ["list", "board", "gantt"] as const;

type TasksPageProps = {
  projectId: number;
};

export function TasksPage({ projectId }: TasksPageProps) {
  const [activeTab, setActiveTab] = useUrlTabState({
    values: TASK_TABS,
    defaultValue: "list",
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(ALL_STATUSES);
  const [priority, setPriority] = useState(ALL_PRIORITIES);
  const [taskType, setTaskType] = useState(ALL_TYPES);
  const [overdue, setOverdue] = useState(ALL_OVERDUE);
  const [assigneeId, setAssigneeId] = useState("");
  const [requirementId, setRequirementId] = useState("");
  const [tag, setTag] = useState("");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [sort, setSort] =
    useState<(typeof SORT_OPTIONS)[number]["value"]>("updated_desc");
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState(NO_BULK_STATUS_CHANGE);
  const [bulkAssigneeId, setBulkAssigneeId] = useState("");
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [ganttStartDate, setGanttStartDate] = useState("");
  const [ganttEndDate, setGanttEndDate] = useState("");
  const [ganttAssigneeId, setGanttAssigneeId] = useState("");
  const [ganttRequirementId, setGanttRequirementId] = useState("");
  const [ganttDisplayUnit, setGanttDisplayUnit] =
    useState<(typeof GANTT_DISPLAY_OPTIONS)[number]["value"]>("day");
  const [boardSwimlane, setBoardSwimlane] = useState<BoardSwimlane>("none");
  const [isBoardCompletedCollapsed, setIsBoardCompletedCollapsed] =
    useState(true);
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
  const { tasks, total, isLoading, isFetching, error, refetch } = useTasks(
    projectId,
    {
      page,
      page_size: PAGE_SIZE,
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
  );
  const { gantt, isLoading: isGanttLoading } = useGantt(projectId, {
    start_date: ganttStartDate || undefined,
    end_date: ganttEndDate || undefined,
    assignee_id: ganttAssigneeId ? Number(ganttAssigneeId) : undefined,
    requirement_id: ganttRequirementId ? Number(ganttRequirementId) : undefined,
  });
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
      <PageHeader
        title="タスク"
        description="プロジェクトのタスク、カンバン、ガントチャートを管理します。"
        actions={
          canCreate ? (
            <Button type="button" onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              タスク新規作成
            </Button>
          ) : null
        }
      />

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
          <TaskFilters
            projectId={projectId}
            searchInput={searchInput}
            status={status}
            priority={priority}
            taskType={taskType}
            overdue={overdue}
            assigneeId={assigneeId}
            requirementId={requirementId}
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
            onAssigneeIdChange={(value) => {
              setPage(1);
              setAssigneeId(value);
            }}
            onRequirementIdChange={(value) => {
              setPage(1);
              setRequirementId(value);
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
          <TaskBoardToolbar
            projectId={projectId}
            searchInput={searchInput}
            status={status}
            priority={priority}
            taskType={taskType}
            overdue={overdue}
            assigneeId={assigneeId}
            requirementId={requirementId}
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
            onAssigneeIdChange={(value) => {
              setPage(1);
              setAssigneeId(value);
            }}
            onRequirementIdChange={(value) => {
              setPage(1);
              setRequirementId(value);
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
            onCompletedCollapsedChange={setIsBoardCompletedCollapsed}
          />
          <TasksBoardSection
            projectId={projectId}
            tasks={tasks}
            canUpdate={canUpdate}
            swimlane={boardSwimlane}
            isCompletedCollapsed={isBoardCompletedCollapsed}
          />
        </TabsContent>

        <TabsContent value="gantt" className="flex flex-col gap-4">
          <GanttControls
            projectId={projectId}
            canUpdate={canUpdate}
            startDate={ganttStartDate}
            endDate={ganttEndDate}
            assigneeId={ganttAssigneeId}
            requirementId={ganttRequirementId}
            displayUnit={ganttDisplayUnit}
            gantt={gantt}
            milestones={milestones}
            onStartDateChange={setGanttStartDate}
            onEndDateChange={setGanttEndDate}
            onAssigneeIdChange={setGanttAssigneeId}
            onRequirementIdChange={setGanttRequirementId}
            onDisplayUnitChange={(value) =>
              setGanttDisplayUnit(value as typeof ganttDisplayUnit)
            }
            onOpenMilestoneList={() => setMilestoneListDialogOpen(true)}
            onOpenMilestoneCreate={() => setMilestoneCreateDialogOpen(true)}
          />
          <TasksGanttSection
            projectId={projectId}
            gantt={gantt}
            isLoading={isGanttLoading}
            displayUnit={ganttDisplayUnit}
            canUpdate={canUpdate}
            onMilestoneSelect={setEditingMilestone}
          />
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

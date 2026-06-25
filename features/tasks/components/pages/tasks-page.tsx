"use client";

import { useMemo, useState } from "react";
import { ListIcon, PlusIcon, SlidersHorizontalIcon } from "lucide-react";

import { SearchFilterBar } from "@/components/shared/filters/search-filter-bar";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  canCreateTask,
  canUpdateTask,
} from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import type { GanttResponse, MilestoneRead } from "@/lib/api/generated/model";

import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_TYPE_OPTIONS,
} from "../../constants/task-options";
import { useBulkUpdateTasks } from "../../hooks/use-bulk-update-tasks";
import { useCreateTask } from "../../hooks/use-create-task";
import { useGantt } from "../../hooks/use-gantt";
import { useMilestones } from "../../hooks/use-milestones";
import { useTasks } from "../../hooks/use-tasks";
import { defaultTaskFormValues } from "../../lib/task-mappers";
import { TaskForm } from "../forms/task-form";
import { TaskRequirementSelectField } from "../forms/task-requirement-select-field";
import { TaskUserSelectField } from "../forms/task-user-select-field";
import { MilestoneDialogs } from "../sections/milestone-dialogs";
import {
  type BoardSwimlane,
  TasksBoardSection,
} from "../sections/tasks-board-section";
import { TasksGanttSection } from "../sections/tasks-gantt-section";
import { TasksTable } from "../tables/tasks-table";

const PAGE_SIZE = 20;
const ALL_STATUSES = "all";
const ALL_PRIORITIES = "all";
const ALL_OVERDUE = "all";
const ALL_TYPES = "all";
const NO_BULK_STATUS_CHANGE = "no_change";
const ALL_GANTT_FILTERS = "";

const SORT_OPTIONS = [
  { value: "updated_desc", label: "更新日時 新しい順" },
  { value: "updated_asc", label: "更新日時 古い順" },
  { value: "code_asc", label: "タスクID 昇順" },
  { value: "code_desc", label: "タスクID 降順" },
  { value: "due_date_asc", label: "終了予定日 昇順" },
  { value: "due_date_desc", label: "終了予定日 降順" },
  { value: "progress_desc", label: "進捗率 高い順" },
] as const;

const GANTT_DISPLAY_OPTIONS = [
  { value: "day", label: "日" },
  { value: "week", label: "週" },
  { value: "month", label: "月" },
  { value: "quarter", label: "四半期" },
] as const;

const BOARD_SWIMLANE_OPTIONS = [
  { value: "none", label: "スイムレーンなし" },
  { value: "assignee", label: "担当者別" },
  { value: "requirement", label: "要件別" },
  { value: "parent_task", label: "親タスク別" },
  { value: "priority", label: "優先度別" },
  { value: "task_type", label: "種別別" },
] as const;

type TasksPageProps = {
  projectId: number;
};

export function TasksPage({ projectId }: TasksPageProps) {
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
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]["value"]>(
    "updated_desc"
  );
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
  const { tasks, total, isLoading, isFetching } = useTasks(projectId, {
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
  });
  const { gantt, isLoading: isGanttLoading } = useGantt(projectId, {
    start_date: ganttStartDate || undefined,
    end_date: ganttEndDate || undefined,
    assignee_id: ganttAssigneeId ? Number(ganttAssigneeId) : undefined,
    requirement_id: ganttRequirementId ? Number(ganttRequirementId) : undefined,
  });
  const { milestones } = useMilestones(projectId);
  const { createTask, isPending: isCreatePending, error: createError } =
    useCreateTask(projectId);
  const { bulkUpdateTasks, isPending: isBulkUpdatePending } =
    useBulkUpdateTasks(projectId);
  const selectedTasks = useMemo(() => {
    return tasks.filter((task) => selectedTaskIds.includes(task.id));
  }, [selectedTaskIds, tasks]);
  const hasBulkChange =
    bulkStatus !== NO_BULK_STATUS_CHANGE || Boolean(bulkAssigneeId || bulkDueDate);

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
        current.filter(
          (taskId) => !tasks.some((task) => task.id === taskId)
        )
      );
      return;
    }

    setSelectedTaskIds((current) =>
      Array.from(new Set([...current, ...tasks.map((task) => task.id)]))
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
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">タスク</h2>
          <p className="text-sm text-muted-foreground">
            プロジェクトのタスク、カンバン、ガントチャートを管理します。
          </p>
        </div>
        {canCreate ? (
          <Button type="button" onClick={() => setCreateDialogOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            タスク新規作成
          </Button>
        ) : null}
      </div>

      <Tabs defaultValue="list">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
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

function GanttControls({
  projectId,
  canUpdate,
  startDate,
  endDate,
  assigneeId,
  requirementId,
  displayUnit,
  gantt,
  milestones,
  onStartDateChange,
  onEndDateChange,
  onAssigneeIdChange,
  onRequirementIdChange,
  onDisplayUnitChange,
  onOpenMilestoneList,
  onOpenMilestoneCreate,
}: {
  projectId: number;
  canUpdate: boolean;
  startDate: string;
  endDate: string;
  assigneeId: string;
  requirementId: string;
  displayUnit: string;
  gantt: GanttResponse | null;
  milestones: MilestoneRead[];
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onAssigneeIdChange: (value: string) => void;
  onRequirementIdChange: (value: string) => void;
  onDisplayUnitChange: (value: string) => void;
  onOpenMilestoneList: () => void;
  onOpenMilestoneCreate: () => void;
}) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const handleMoveRange = (direction: -1 | 1) => {
    const currentRange = getCurrentGanttRange(startDate, endDate, displayUnit);
    const movedRange = moveGanttRange(currentRange, displayUnit, direction);

    onStartDateChange(movedRange.startDate);
    onEndDateChange(movedRange.endDate);
  };
  const handleMoveToToday = () => {
    const todayRange = getTodayGanttRange(displayUnit);

    onStartDateChange(todayRange.startDate);
    onEndDateChange(todayRange.endDate);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ガント表示条件</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(10rem,12rem)_auto] xl:items-end">
          <div className="flex min-w-0 flex-col gap-2">
            <Label>表示単位</Label>
            <Select value={displayUnit} onValueChange={onDisplayUnitChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {GANTT_DISPLAY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleMoveRange(-1)}
            >
              前へ
            </Button>
            <Button type="button" variant="outline" onClick={handleMoveToToday}>
              今日
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleMoveRange(1)}
            >
              次へ
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!milestones.length}
              onClick={onOpenMilestoneList}
            >
              <ListIcon data-icon="inline-start" />
              マイルストーン一覧
            </Button>
            {canUpdate ? (
              <Button
                type="button"
                variant="outline"
                onClick={onOpenMilestoneCreate}
              >
                <PlusIcon data-icon="inline-start" />
                マイルストーン追加
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAdvancedOpen((current) => !current)}
            >
              <SlidersHorizontalIcon data-icon="inline-start" />
              詳細条件
            </Button>
          </div>
        </div>
        {isAdvancedOpen ? (
          <div className="grid gap-3 border-t pt-3 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end">
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="gantt-start-date">開始日</Label>
              <Input
                id="gantt-start-date"
                type="date"
                value={startDate}
                onChange={(event) => onStartDateChange(event.target.value)}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="gantt-end-date">終了日</Label>
              <Input
                id="gantt-end-date"
                type="date"
                value={endDate}
                onChange={(event) => onEndDateChange(event.target.value)}
              />
            </div>
            <TaskUserSelectField
              projectId={projectId}
              label="担当者"
              value={assigneeId}
              placeholder="すべて"
              onChange={onAssigneeIdChange}
            />
            <TaskRequirementSelectField
              projectId={projectId}
              value={requirementId}
              placeholder="すべて"
              onChange={onRequirementIdChange}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!gantt}
                onClick={() => {
                  if (gantt) {
                    exportGanttCsv(gantt);
                  }
                }}
              >
                CSV出力
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!gantt}
                onClick={() => {
                  if (gantt) {
                    exportGanttPdf(gantt, displayUnit);
                  }
                }}
              >
                PDF出力
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onStartDateChange(ALL_GANTT_FILTERS);
                  onEndDateChange(ALL_GANTT_FILTERS);
                  onAssigneeIdChange(ALL_GANTT_FILTERS);
                  onRequirementIdChange(ALL_GANTT_FILTERS);
                }}
              >
                条件クリア
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

const getCurrentGanttRange = (
  startDate: string,
  endDate: string,
  displayUnit: string
) => {
  if (startDate && endDate) {
    return { start: new Date(startDate), end: new Date(endDate) };
  }

  const todayRange = getTodayGanttRange(displayUnit);

  return {
    start: new Date(todayRange.startDate),
    end: new Date(todayRange.endDate),
  };
};

const getTodayGanttRange = (displayUnit: string) => {
  const today = new Date();
  const days = getGanttWindowDays(displayUnit);
  const start = addDays(today, -Math.floor(days / 3));
  const end = addDays(start, days);

  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
};

const moveGanttRange = (
  range: { start: Date; end: Date },
  displayUnit: string,
  direction: -1 | 1
) => {
  if (displayUnit === "month") {
    return {
      startDate: toDateInputValue(addMonths(range.start, direction)),
      endDate: toDateInputValue(addMonths(range.end, direction)),
    };
  }

  if (displayUnit === "quarter") {
    return {
      startDate: toDateInputValue(addMonths(range.start, direction * 3)),
      endDate: toDateInputValue(addMonths(range.end, direction * 3)),
    };
  }

  const days = getGanttWindowDays(displayUnit) * direction;

  return {
    startDate: toDateInputValue(addDays(range.start, days)),
    endDate: toDateInputValue(addDays(range.end, days)),
  };
};

const getGanttWindowDays = (displayUnit: string) => {
  switch (displayUnit) {
    case "week":
      return 28;
    case "month":
      return 120;
    case "quarter":
      return 365;
    case "day":
    default:
      return 21;
  }
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);

  next.setDate(next.getDate() + days);

  return next;
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);

  next.setMonth(next.getMonth() + months);

  return next;
};

const toDateInputValue = (date: Date) => {
  return date.toISOString().slice(0, 10);
};

function TaskBulkActions({
  projectId,
  selectedCount,
  status,
  assigneeId,
  dueDate,
  isPending,
  disabled,
  onStatusChange,
  onAssigneeIdChange,
  onDueDateChange,
  onApply,
  onClearSelection,
}: {
  projectId: number;
  selectedCount: number;
  status: string;
  assigneeId: string;
  dueDate: string;
  isPending: boolean;
  disabled: boolean;
  onStatusChange: (value: string) => void;
  onAssigneeIdChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onApply: () => Promise<void>;
  onClearSelection: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">一括更新</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <p className="text-sm text-muted-foreground lg:w-28">
          選択中: {selectedCount}件
        </p>
        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-2">
            <Label>ステータス</Label>
            <Select value={status} onValueChange={onStatusChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="変更しない" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={NO_BULK_STATUS_CHANGE}>変更しない</SelectItem>
                  {TASK_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <TaskUserSelectField
            projectId={projectId}
            label="担当者"
            value={assigneeId}
            placeholder="変更しない"
            onChange={onAssigneeIdChange}
          />
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="bulk-due-date">終了予定日</Label>
            <Input
              id="bulk-due-date"
              type="date"
              value={dueDate}
              onChange={(event) => onDueDateChange(event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={disabled || isPending}
            onClick={() => void onApply()}
          >
            一括更新
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!selectedCount || isPending}
            onClick={onClearSelection}
          >
            選択解除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskFilters({
  projectId,
  searchInput,
  status,
  priority,
  taskType,
  overdue,
  assigneeId,
  requirementId,
  tag,
  startDateFrom,
  dueDateTo,
  sort,
  onSearchInputChange,
  onSearch,
  onStatusChange,
  onPriorityChange,
  onTaskTypeChange,
  onAssigneeIdChange,
  onRequirementIdChange,
  onTagChange,
  onStartDateFromChange,
  onDueDateToChange,
  onOverdueChange,
  onSortChange,
}: {
  projectId: number;
  searchInput: string;
  status: string;
  priority: string;
  taskType: string;
  overdue: string;
  assigneeId: string;
  requirementId: string;
  tag: string;
  startDateFrom: string;
  dueDateTo: string;
  sort: string;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onTaskTypeChange: (value: string) => void;
  onAssigneeIdChange: (value: string) => void;
  onRequirementIdChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onStartDateFromChange: (value: string) => void;
  onDueDateToChange: (value: string) => void;
  onOverdueChange: (value: string) => void;
  onSortChange: (value: string) => void;
}) {
  return (
    <SearchFilterBar
      searchValue={searchInput}
      searchLabel="キーワード"
      searchPlaceholder="タスクID、タイトル、説明で検索"
      variant="compact"
      onSearchValueChange={onSearchInputChange}
      onSearch={onSearch}
    >
      <TaskFilterSelect
        label="ステータス"
        value={status}
        placeholder="ステータスを選択"
        allValue={ALL_STATUSES}
        allLabel="すべてのステータス"
        options={TASK_STATUS_OPTIONS}
        onValueChange={onStatusChange}
      />
      <TaskFilterSelect
        label="優先度"
        value={priority}
        placeholder="優先度を選択"
        allValue={ALL_PRIORITIES}
        allLabel="すべての優先度"
        options={TASK_PRIORITY_OPTIONS}
        onValueChange={onPriorityChange}
      />
      <TaskFilterSelect
        label="種別"
        value={taskType}
        placeholder="種別を選択"
        allValue={ALL_TYPES}
        allLabel="すべての種別"
        options={TASK_TYPE_OPTIONS}
        onValueChange={onTaskTypeChange}
      />
      <TaskFilterSelect
        label="期限"
        value={overdue}
        placeholder="期限を選択"
        allValue={ALL_OVERDUE}
        allLabel="すべての期限"
        options={[{ value: "overdue", label: "期限超過" }]}
        onValueChange={onOverdueChange}
      />
      <TaskUserSelectField
        projectId={projectId}
        label="担当者"
        value={assigneeId}
        placeholder="担当者を選択"
        onChange={onAssigneeIdChange}
      />
      <TaskRequirementSelectField
        projectId={projectId}
        value={requirementId}
        placeholder="関連要件を選択"
        onChange={onRequirementIdChange}
      />
      <Field>
        <FieldLabel>タグ</FieldLabel>
        <Input
          value={tag}
          placeholder="タグで絞り込み"
          onChange={(event) => onTagChange(event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel>開始日</FieldLabel>
        <Input
          type="date"
          value={startDateFrom}
          onChange={(event) => onStartDateFromChange(event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel>終了予定日</FieldLabel>
        <Input
          type="date"
          value={dueDateTo}
          onChange={(event) => onDueDateToChange(event.target.value)}
        />
      </Field>
      <TaskFilterSelect
        label="並び順"
        value={sort}
        placeholder="並び順を選択"
        options={SORT_OPTIONS}
        onValueChange={onSortChange}
      />
    </SearchFilterBar>
  );
}

function TaskBoardToolbar({
  projectId,
  searchInput,
  status,
  priority,
  taskType,
  overdue,
  assigneeId,
  requirementId,
  tag,
  startDateFrom,
  dueDateTo,
  sort,
  swimlane,
  isCompletedCollapsed,
  onSearchInputChange,
  onSearch,
  onStatusChange,
  onPriorityChange,
  onTaskTypeChange,
  onAssigneeIdChange,
  onRequirementIdChange,
  onTagChange,
  onStartDateFromChange,
  onDueDateToChange,
  onOverdueChange,
  onSortChange,
  onSwimlaneChange,
  onCompletedCollapsedChange,
}: {
  projectId: number;
  searchInput: string;
  status: string;
  priority: string;
  taskType: string;
  overdue: string;
  assigneeId: string;
  requirementId: string;
  tag: string;
  startDateFrom: string;
  dueDateTo: string;
  sort: string;
  swimlane: BoardSwimlane;
  isCompletedCollapsed: boolean;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onTaskTypeChange: (value: string) => void;
  onAssigneeIdChange: (value: string) => void;
  onRequirementIdChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onStartDateFromChange: (value: string) => void;
  onDueDateToChange: (value: string) => void;
  onOverdueChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onSwimlaneChange: (value: BoardSwimlane) => void;
  onCompletedCollapsedChange: (value: boolean) => void;
}) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
      <form
        className="grid gap-3 xl:grid-cols-[minmax(16rem,1.3fr)_minmax(10rem,0.8fr)_minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,1fr)_auto] xl:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <Field>
          <FieldLabel htmlFor="task-board-keyword">キーワード</FieldLabel>
          <Input
            id="task-board-keyword"
            value={searchInput}
            placeholder="タスクID、タイトル、説明"
            onChange={(event) => onSearchInputChange(event.target.value)}
          />
        </Field>
        <TaskFilterSelect
          label="ステータス"
          value={status}
          placeholder="ステータス"
          allValue={ALL_STATUSES}
          allLabel="すべて"
          options={TASK_STATUS_OPTIONS}
          onValueChange={onStatusChange}
        />
        <TaskUserSelectField
          projectId={projectId}
          label="担当者"
          value={assigneeId}
          placeholder="すべて"
          onChange={onAssigneeIdChange}
        />
        <Field>
          <FieldLabel htmlFor="task-board-tag">タグ</FieldLabel>
          <Input
            id="task-board-tag"
            value={tag}
            placeholder="タグ"
            onChange={(event) => onTagChange(event.target.value)}
          />
        </Field>
        <TaskFilterSelect
          label="スイムレーン"
          value={swimlane}
          placeholder="スイムレーン"
          options={BOARD_SWIMLANE_OPTIONS}
          onValueChange={(value) => onSwimlaneChange(value as BoardSwimlane)}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm">
            検索
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdvancedOpen((current) => !current)}
          >
            <SlidersHorizontalIcon data-icon="inline-start" />
            詳細条件
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onCompletedCollapsedChange(!isCompletedCollapsed)}
          >
            {isCompletedCollapsed ? "完了を表示" : "完了を隠す"}
          </Button>
        </div>
      </form>
      {isAdvancedOpen ? (
        <div className="grid gap-3 border-t pt-3 md:grid-cols-2 xl:grid-cols-6">
          <TaskFilterSelect
            label="優先度"
            value={priority}
            placeholder="優先度"
            allValue={ALL_PRIORITIES}
            allLabel="すべて"
            options={TASK_PRIORITY_OPTIONS}
            onValueChange={onPriorityChange}
          />
          <TaskFilterSelect
            label="種別"
            value={taskType}
            placeholder="種別"
            allValue={ALL_TYPES}
            allLabel="すべて"
            options={TASK_TYPE_OPTIONS}
            onValueChange={onTaskTypeChange}
          />
          <TaskFilterSelect
            label="期限"
            value={overdue}
            placeholder="期限"
            allValue={ALL_OVERDUE}
            allLabel="すべて"
            options={[{ value: "overdue", label: "期限超過" }]}
            onValueChange={onOverdueChange}
          />
          <TaskRequirementSelectField
            projectId={projectId}
            value={requirementId}
            placeholder="関連要件"
            onChange={onRequirementIdChange}
          />
          <Field>
            <FieldLabel htmlFor="task-board-start-date">開始日</FieldLabel>
            <Input
              id="task-board-start-date"
              type="date"
              value={startDateFrom}
              onChange={(event) => onStartDateFromChange(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="task-board-due-date">終了予定日</FieldLabel>
            <Input
              id="task-board-due-date"
              type="date"
              value={dueDateTo}
              onChange={(event) => onDueDateToChange(event.target.value)}
            />
          </Field>
          <TaskFilterSelect
            label="並び順"
            value={sort}
            placeholder="並び順"
            options={SORT_OPTIONS}
            onValueChange={onSortChange}
          />
        </div>
      ) : null}
    </div>
  );
}

type TaskFilterSelectProps = {
  label: string;
  value: string;
  placeholder: string;
  options: readonly { value: string; label: string }[];
  allValue?: string;
  allLabel?: string;
  onValueChange: (value: string) => void;
};

function TaskFilterSelect({
  label,
  value,
  placeholder,
  options,
  allValue,
  allLabel,
  onValueChange,
}: TaskFilterSelectProps) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {allValue && allLabel ? (
              <SelectItem value={allValue}>{allLabel}</SelectItem>
            ) : null}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

const exportGanttCsv = (gantt: GanttResponse) => {
  const rows = [
    [
      "type",
      "id",
      "code",
      "title",
      "status",
      "assignee_id",
      "start_date",
      "due_date",
      "progress_percent",
      "target_date",
    ],
    ...gantt.tasks.map((task) => [
      "task",
      String(task.id),
      task.task_code,
      task.title,
      task.status ?? "",
      task.assignee_id ? String(task.assignee_id) : "",
      task.start_date ?? "",
      task.due_date ?? "",
      String(task.progress_percent ?? 0),
      "",
    ]),
    ...gantt.milestones.map((milestone) => [
      "milestone",
      String(milestone.id),
      "",
      milestone.title,
      milestone.status ?? "",
      "",
      "",
      "",
      "",
      milestone.target_date,
    ]),
  ];
  const csv = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "gantt.csv";
  link.click();
  URL.revokeObjectURL(url);
};

const exportGanttPdf = (gantt: GanttResponse, displayUnit: string) => {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");

  if (!printWindow) {
    return;
  }

  printWindow.document.write(getGanttPrintHtml(gantt, displayUnit));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

const getGanttPrintHtml = (gantt: GanttResponse, displayUnit: string) => {
  const tasks = gantt.tasks
    .map(
      (task) => `
        <tr>
          <td>${escapeHtml(task.task_code)}</td>
          <td>${escapeHtml(task.title)}</td>
          <td>${escapeHtml(task.status ?? "")}</td>
          <td>${task.assignee_id ?? ""}</td>
          <td>${escapeHtml(task.start_date ?? "")}</td>
          <td>${escapeHtml(task.due_date ?? "")}</td>
          <td>${task.progress_percent ?? 0}%</td>
        </tr>
      `
    )
    .join("");
  const milestones = gantt.milestones
    .map(
      (milestone) => `
        <tr>
          <td>${escapeHtml(milestone.title)}</td>
          <td>${escapeHtml(milestone.target_date)}</td>
          <td>${escapeHtml(milestone.status ?? "")}</td>
        </tr>
      `
    )
    .join("");
  const dependencies = gantt.dependencies
    .map(
      (dependency) => `
        <tr>
          <td>${dependency.predecessor_task_id}</td>
          <td>${dependency.successor_task_id}</td>
          <td>${escapeHtml(dependency.dependency_type ?? "")}</td>
          <td>${dependency.lag_days ?? 0}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <title>ガントチャート</title>
        <style>
          body {
            color: #111;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            margin: 24px;
          }
          h1 {
            font-size: 20px;
            margin: 0 0 8px;
          }
          h2 {
            font-size: 15px;
            margin: 24px 0 8px;
          }
          p {
            color: #555;
            font-size: 12px;
            margin: 0 0 16px;
          }
          table {
            border-collapse: collapse;
            font-size: 11px;
            width: 100%;
          }
          th,
          td {
            border: 1px solid #ddd;
            padding: 6px 8px;
            text-align: left;
            vertical-align: top;
          }
          th {
            background: #f3f4f6;
            font-weight: 600;
          }
          @page {
            margin: 14mm;
          }
        </style>
      </head>
      <body>
        <h1>ガントチャート</h1>
        <p>表示単位: ${escapeHtml(getGanttDisplayUnitLabel(displayUnit))}</p>
        <h2>タスク</h2>
        <table>
          <thead>
            <tr>
              <th>タスクID</th>
              <th>タイトル</th>
              <th>状態</th>
              <th>担当者ID</th>
              <th>開始日</th>
              <th>終了予定日</th>
              <th>進捗</th>
            </tr>
          </thead>
          <tbody>${tasks || getPrintEmptyRow(7)}</tbody>
        </table>
        <h2>マイルストーン</h2>
        <table>
          <thead>
            <tr>
              <th>タイトル</th>
              <th>対象日</th>
              <th>状態</th>
            </tr>
          </thead>
          <tbody>${milestones || getPrintEmptyRow(3)}</tbody>
        </table>
        <h2>依存関係</h2>
        <table>
          <thead>
            <tr>
              <th>先行タスクID</th>
              <th>後続タスクID</th>
              <th>種別</th>
              <th>ラグ日数</th>
            </tr>
          </thead>
          <tbody>${dependencies || getPrintEmptyRow(4)}</tbody>
        </table>
      </body>
    </html>
  `;
};

const getPrintEmptyRow = (colSpan: number) => {
  return `<tr><td colspan="${colSpan}">データはありません。</td></tr>`;
};

const getGanttDisplayUnitLabel = (displayUnit: string) => {
  const option = GANTT_DISPLAY_OPTIONS.find((item) => item.value === displayUnit);

  return option?.label ?? displayUnit;
};

const escapeCsvValue = (value: string) => {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
};

const escapeHtml = (value: string) => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

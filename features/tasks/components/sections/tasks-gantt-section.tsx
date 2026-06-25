"use client";

import { useRef, useState } from "react";
import {
  CalendarPlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GripVerticalIcon,
  PanelRightOpenIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type {
  GanttResponse,
  MilestoneRead,
  TaskRead,
} from "@/lib/api/generated/model";
import { formatDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";

import { useUpdateTaskQuick } from "../../hooks/use-update-task-quick";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { getMilestoneStatusLabel } from "../../constants/task-options";
import {
  TaskFlagBadges,
  TaskPriorityBadge,
  TaskStatusBadge,
  TaskTags,
  TaskTypeBadge,
} from "../shared/task-badges";
import { TaskDetailSheet } from "./task-detail-sheet";

type TasksGanttSectionProps = {
  projectId: number;
  gantt: GanttResponse | null;
  isLoading: boolean;
  displayUnit: GanttDisplayUnit;
  canUpdate: boolean;
  onMilestoneSelect: (milestone: MilestoneRead) => void;
};

export function TasksGanttSection({
  projectId,
  gantt,
  isLoading,
  displayUnit,
  canUpdate,
  onMilestoneSelect,
}: TasksGanttSectionProps) {
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<number[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [unscheduledPanelOpen, setUnscheduledPanelOpen] = useState(false);
  const [draggingUnscheduledTaskId, setDraggingUnscheduledTaskId] =
    useState<number | null>(null);
  const [highlightedDropDate, setHighlightedDropDate] = useState<string | null>(
    null
  );
  const { updateTaskQuick, isPending } = useUpdateTaskQuick(projectId);
  const { getTaskUserLabel } = useTaskUserMap(projectId);

  if (isLoading) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        ガントチャートを読み込んでいます。
      </div>
    );
  }

  const tasks = gantt?.tasks ?? [];
  const dependencies = gantt?.dependencies ?? [];
  const milestones = gantt?.milestones ?? [];
  const visibleTasks = tasks.filter((task) => task.start_date || task.due_date);
  const unscheduledTasks = tasks.filter(
    (task) => !task.start_date && !task.due_date
  );
  const visibleMilestones = milestones.filter((milestone) => milestone.target_date);
  const range =
    getDateRange(visibleTasks, visibleMilestones, displayUnit) ??
    (unscheduledTasks.length ? getFallbackDateRange(displayUnit) : null);
  const parentTaskIds = new Set(
    visibleTasks
      .map((task) => task.parent_task_id)
      .filter((taskId): taskId is number => Boolean(taskId))
  );
  const displayedTasks = visibleTasks.filter(
    (task) =>
      !task.parent_task_id || !collapsedTaskIds.includes(task.parent_task_id)
  );
  const timelineWidth = range ? getTimelineWidth(range, displayUnit) : 0;
  const ganttWidth = GANTT_TASK_COLUMN_WIDTH + timelineWidth;
  const ganttGridStyle = {
    gridTemplateColumns: `${GANTT_TASK_COLUMN_WIDTH}px ${timelineWidth}px`,
  };
  const dropUnscheduledTask = (
    task: TaskRead,
    dropDate: Date
  ): Promise<unknown> => {
    const startDate = toDateInputValue(dropDate);

    setDraggingUnscheduledTaskId(null);
    setHighlightedDropDate(null);
    return updateTaskQuick(task, { startDate, dueDate: startDate });
  };
  const clearUnscheduledDragState = () => {
    setDraggingUnscheduledTaskId(null);
    setHighlightedDropDate(null);
  };

  if (!range && !unscheduledTasks.length) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        開始日、終了予定日、またはマイルストーンが設定されていません。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {canUpdate && unscheduledTasks.length ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUnscheduledPanelOpen(true)}
          >
            <PanelRightOpenIcon data-icon="inline-start" />
            未配置タスク {unscheduledTasks.length}
          </Button>
        </div>
      ) : null}
      <UnscheduledTasksPanel
        open={unscheduledPanelOpen}
        tasks={unscheduledTasks}
        isPending={isPending}
        onClose={() => {
          setUnscheduledPanelOpen(false);
          clearUnscheduledDragState();
        }}
        onOpenDetail={setSelectedTaskId}
        onDragStart={setDraggingUnscheduledTaskId}
        onDragEnd={clearUnscheduledDragState}
        onAddToday={(task) => {
          const today = new Date();
          return dropUnscheduledTask(task, today);
        }}
      />
      {range ? (
        <div className="overflow-x-auto rounded-lg border">
          <div style={{ width: `${ganttWidth}px` }}>
            <div
              className="grid border-b bg-muted/40 text-xs text-muted-foreground"
              style={ganttGridStyle}
            >
              <div className="sticky left-0 z-20 border-r bg-muted/40 px-3 py-2">
                タスク
              </div>
              <GanttTimelineHeader
                range={range}
                displayUnit={displayUnit}
                milestones={visibleMilestones}
                highlightedDropDate={highlightedDropDate}
                canUpdate={canUpdate}
                onMilestoneSelect={onMilestoneSelect}
              />
            </div>
            {canUpdate && unscheduledTasks.length && unscheduledPanelOpen ? (
              <GanttUnscheduledDropLane
                tasks={unscheduledTasks}
                range={range}
                gridStyle={ganttGridStyle}
                milestones={visibleMilestones}
                isDragging={Boolean(draggingUnscheduledTaskId)}
                highlightedDropDate={highlightedDropDate}
                onDropTask={dropUnscheduledTask}
                onDropDateHover={setHighlightedDropDate}
                onDropDateClear={() => setHighlightedDropDate(null)}
              />
            ) : null}
            <div className="divide-y">
              {displayedTasks.map((task) => (
                <GanttTaskRow
                  key={`${task.id}-${task.version}-${task.start_date ?? "none"}-${task.due_date ?? "none"}`}
                  task={task}
                  range={range}
                  milestones={visibleMilestones}
                  gridStyle={ganttGridStyle}
                  assigneeLabel={getTaskUserLabel(task.assignee_id)}
                  highlightedDropDate={highlightedDropDate}
                  unscheduledTasks={unscheduledTasks}
                  hasChildren={parentTaskIds.has(task.id)}
                  isCollapsed={collapsedTaskIds.includes(task.id)}
                  canUpdate={canUpdate}
                  isPending={isPending}
                  onToggleCollapse={() =>
                    setCollapsedTaskIds((current) =>
                      current.includes(task.id)
                        ? current.filter((taskId) => taskId !== task.id)
                        : [...current, task.id]
                    )
                  }
                  onScheduleUpdate={(values) => updateTaskQuick(task, values)}
                  onOpenDetail={setSelectedTaskId}
                  onDropUnscheduledTask={(task, dropDate) =>
                    dropUnscheduledTask(task, dropDate)
                  }
                  onDropDateHover={setHighlightedDropDate}
                  onDropDateClear={() => setHighlightedDropDate(null)}
                />
              ))}
              {visibleMilestones.length ? (
                <div className="grid bg-muted/20" style={ganttGridStyle}>
                  <div className="sticky left-0 z-10 border-r bg-muted/20 px-3 py-2 text-sm font-medium">
                    マイルストーン
                  </div>
                  <GanttDroppableTimeline
                    className="py-4"
                    tasks={unscheduledTasks}
                    range={range}
                    highlightedDropDate={highlightedDropDate}
                    isDropEnabled={canUpdate && Boolean(unscheduledTasks.length)}
                    onDropTask={dropUnscheduledTask}
                    onDropDateHover={setHighlightedDropDate}
                    onDropDateClear={() => setHighlightedDropDate(null)}
                  >
                    <WeekendBands range={range} />
                    <GanttMilestoneLines
                      milestones={visibleMilestones}
                      range={range}
                    />
                    <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                    <TodayLine range={range} />
                    {visibleMilestones.map((milestone) => (
                      <GanttMilestoneMarker
                        key={milestone.id}
                        milestone={milestone}
                        range={range}
                        showLabel={visibleMilestones.length <= 3}
                        canUpdate={canUpdate}
                        onSelect={onMilestoneSelect}
                      />
                    ))}
                  </GanttDroppableTimeline>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          ガントに表示できる日付設定済みタスク、またはマイルストーンがありません。
        </div>
      )}
      {dependencies.length ? (
        <GanttDependenciesSummary tasks={tasks} dependencies={dependencies} />
      ) : null}
      <TaskDetailSheet
        projectId={projectId}
        taskId={selectedTaskId}
        open={Boolean(selectedTaskId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTaskId(null);
          }
        }}
      />
    </div>
  );
}

function UnscheduledTasksPanel({
  open,
  tasks,
  isPending,
  onClose,
  onOpenDetail,
  onDragStart,
  onDragEnd,
  onAddToday,
}: {
  open: boolean;
  tasks: TaskRead[];
  isPending: boolean;
  onClose: () => void;
  onOpenDetail: (taskId: number) => void;
  onDragStart: (taskId: number) => void;
  onDragEnd: () => void;
  onAddToday: (task: TaskRead) => Promise<unknown>;
}) {
  if (!open) {
    return null;
  }

  return (
    <aside className="fixed top-0 right-0 bottom-0 z-40 flex w-full max-w-sm flex-col border-l bg-background shadow-lg">
      <div className="flex items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0">
          <h3 className="text-base font-medium">未配置タスク</h3>
          <p className="text-sm text-muted-foreground">
            タスクをガントの日付位置へドラッグします。
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
          <XIcon data-icon="inline-start" />
          <span className="sr-only">閉じる</span>
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {tasks.length ? (
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <UnscheduledTaskDragItem
                key={`${task.id}-${task.version}`}
                task={task}
                isPending={isPending}
                onOpenDetail={onOpenDetail}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onAddToday={onAddToday}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            未配置タスクはありません。
          </p>
        )}
      </div>
    </aside>
  );
}

function UnscheduledTaskDragItem({
  task,
  isPending,
  onOpenDetail,
  onDragStart,
  onDragEnd,
  onAddToday,
}: {
  task: TaskRead;
  isPending: boolean;
  onOpenDetail: (taskId: number) => void;
  onDragStart: (taskId: number) => void;
  onDragEnd: () => void;
  onAddToday: (task: TaskRead) => Promise<unknown>;
}) {
  return (
    <div
      draggable={!isPending}
      className="flex cursor-grab items-start gap-2 rounded-lg border bg-card p-3 active:cursor-grabbing"
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData(UNSCHEDULED_TASK_DND_TYPE, String(task.id));
        setUnscheduledTaskDragImage(event, task);
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
    >
      <GripVerticalIcon className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={() => onOpenDetail(task.id)}
        >
          <span className="block truncate text-sm font-medium">{task.title}</span>
          <span className="text-xs text-muted-foreground">{task.task_code}</span>
        </button>
        <div className="flex flex-wrap gap-1">
          <TaskStatusBadge status={task.status} />
          <TaskFlagBadges isOverdue={task.is_overdue} isBlocked={task.is_blocked} />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => {
            onAddToday(task).catch(() => undefined);
          }}
        >
          <CalendarPlusIcon data-icon="inline-start" />
          今日に追加
        </Button>
      </div>
    </div>
  );
}

function GanttUnscheduledDropLane({
  tasks,
  range,
  gridStyle,
  milestones,
  isDragging,
  highlightedDropDate,
  onDropTask,
  onDropDateHover,
  onDropDateClear,
}: {
  tasks: TaskRead[];
  range: DateRange;
  gridStyle: GanttGridStyle;
  milestones: MilestoneRead[];
  isDragging: boolean;
  highlightedDropDate: string | null;
  onDropTask: (task: TaskRead, dropDate: Date) => Promise<unknown>;
  onDropDateHover: (date: string | null) => void;
  onDropDateClear: () => void;
}) {
  return (
    <div className="grid border-b bg-muted/10" style={gridStyle}>
      <div className="sticky left-0 z-10 border-r bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
        未配置タスクをドロップ
      </div>
      <GanttDroppableTimeline
        className={cn(
          "py-3",
          isDragging && "bg-primary/5"
        )}
        tasks={tasks}
        range={range}
        highlightedDropDate={highlightedDropDate}
        isDropEnabled
        onDropTask={onDropTask}
        onDropDateHover={onDropDateHover}
        onDropDateClear={onDropDateClear}
      >
        <WeekendBands range={range} />
        <GanttMilestoneLines milestones={milestones} range={range} />
        <div className="absolute inset-x-0 top-1/2 h-px border-t border-dashed border-primary/50" />
        <TodayLine range={range} />
        <p className="relative text-center text-xs text-muted-foreground">
          Sheet からここへドラッグ
        </p>
      </GanttDroppableTimeline>
    </div>
  );
}

function GanttDroppableTimeline({
  children,
  className,
  tasks,
  range,
  highlightedDropDate,
  isDropEnabled,
  onDropTask,
  onDropDateHover,
  onDropDateClear,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  children: React.ReactNode;
  className?: string;
  tasks: TaskRead[];
  range: DateRange;
  highlightedDropDate?: string | null;
  isDropEnabled: boolean;
  onDropTask: (task: TaskRead, dropDate: Date) => Promise<unknown>;
  onDropDateHover?: (date: string | null) => void;
  onDropDateClear?: () => void;
  onPointerMove?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const timelineRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={timelineRef}
      className={cn("relative", className)}
      onDragOver={(event) => {
        if (!isDropEnabled || !hasDraggedUnscheduledTask(event.dataTransfer)) {
          return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        onDropDateHover?.(
          toDateInputValue(
            getClientDate(event.clientX, range, timelineRef.current) ?? range.start
          )
        );
      }}
      onDrop={(event) => {
        if (!isDropEnabled) {
          return;
        }

        const taskId = getDraggedUnscheduledTaskId(event.dataTransfer);
        const task = tasks.find((candidate) => candidate.id === taskId);
        const dropDate = getClientDate(
          event.clientX,
          range,
          timelineRef.current
        );

        if (!task || !dropDate) {
          return;
        }

        event.preventDefault();
        onDropDateClear?.();
        onDropTask(task, dropDate).catch(() => undefined);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onDropDateClear?.();
        }
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <DropDateHighlight date={highlightedDropDate} range={range} />
      {children}
    </div>
  );
}

function GanttTimelineHeader({
  range,
  displayUnit,
  milestones,
  highlightedDropDate,
  canUpdate,
  onMilestoneSelect,
}: {
  range: DateRange;
  displayUnit: GanttDisplayUnit;
  milestones: MilestoneRead[];
  highlightedDropDate: string | null;
  canUpdate: boolean;
  onMilestoneSelect: (milestone: MilestoneRead) => void;
}) {
  if (displayUnit !== "day") {
    return (
      <div
        className="relative grid py-5"
        style={{
          gridTemplateColumns: `repeat(${range.labels.length}, minmax(0, 1fr))`,
        }}
      >
        <DropDateHighlight date={highlightedDropDate} range={range} />
        <GanttMilestoneHeaderMarkers
          milestones={milestones}
          range={range}
          canUpdate={canUpdate}
          onSelect={onMilestoneSelect}
        />
        {range.labels.map((label) => (
          <span key={label} className="relative">
            {label}
          </span>
        ))}
      </div>
    );
  }

  const dates = getDateCells(range);

  return (
    <div className="relative py-2">
      <DropDateHighlight date={highlightedDropDate} range={range} />
      <GanttMilestoneHeaderMarkers
        milestones={milestones}
        range={range}
        canUpdate={canUpdate}
        onSelect={onMilestoneSelect}
      />
      <div
        className="grid text-center"
        style={{
          gridTemplateColumns: `repeat(${dates.length}, minmax(28px, 1fr))`,
        }}
      >
        {dates.map((date) => (
          <div
            key={`month-${date.key}`}
            className={cn(
              "min-w-0 border-l border-border/60 px-1 pb-1 text-[11px]",
              date.isMonthStart && "font-medium text-foreground"
            )}
          >
            {date.showMonthLabel ? `${date.date.getMonth() + 1}月` : ""}
          </div>
        ))}
        {dates.map((date) => (
          <div
            key={`day-${date.key}`}
            className={cn(
              "min-w-0 border-l border-border/60 px-1 pt-1 text-xs",
              date.isWeekend && "bg-muted/60",
              date.isToday && "font-semibold text-foreground"
            )}
          >
            {date.date.getDate()}
          </div>
        ))}
      </div>
    </div>
  );
}

function GanttTaskRow({
  task,
  range,
  milestones,
  gridStyle,
  assigneeLabel,
  highlightedDropDate,
  unscheduledTasks,
  hasChildren,
  isCollapsed,
  canUpdate,
  isPending,
  onToggleCollapse,
  onScheduleUpdate,
  onOpenDetail,
  onDropUnscheduledTask,
  onDropDateHover,
  onDropDateClear,
}: {
  task: TaskRead;
  range: DateRange;
  milestones: MilestoneRead[];
  gridStyle: GanttGridStyle;
  assigneeLabel: string;
  highlightedDropDate: string | null;
  unscheduledTasks: TaskRead[];
  hasChildren: boolean;
  isCollapsed: boolean;
  canUpdate: boolean;
  isPending: boolean;
  onToggleCollapse: () => void;
  onScheduleUpdate: (values: {
    startDate?: string;
    dueDate?: string;
  }) => Promise<unknown>;
  onOpenDetail: (taskId: number) => void;
  onDropUnscheduledTask: (
    task: TaskRead,
    dropDate: Date
  ) => Promise<unknown>;
  onDropDateHover: (date: string | null) => void;
  onDropDateClear: () => void;
}) {
  const [startDate, setStartDate] = useState(task.start_date ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [dragState, setDragState] = useState<GanttDragState | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const start = startDate ? new Date(startDate) : range.start;
  const end = dueDate ? new Date(dueDate) : start;
  const plannedBarStyle = getTimelineBarStyle(start, end, range);
  const actualBarStyle = getActualBarStyle(task, range);
  const updateDraggedRange = (event: React.PointerEvent<HTMLElement>) => {
    if (!dragState) {
      return;
    }

    const pointedDate = getPointerDate(event, range, timelineRef.current);

    if (!pointedDate) {
      return;
    }

    const nextRange = getDraggedDateRange(dragState, pointedDate);

    setStartDate(nextRange.startDate);
    setDueDate(nextRange.dueDate);
  };
  const finishDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (!dragState) {
      return;
    }

    const pointedDate = getPointerDate(event, range, timelineRef.current);
    const nextRange = pointedDate
      ? getDraggedDateRange(dragState, pointedDate)
      : { startDate, dueDate };

    setStartDate(nextRange.startDate);
    setDueDate(nextRange.dueDate);
    setDragState(null);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (isScheduleDirty(task, nextRange.startDate, nextRange.dueDate)) {
      onScheduleUpdate({
        startDate: nextRange.startDate,
        dueDate: nextRange.dueDate,
      }).catch(() => undefined);
    }
  };
  const startDrag = (
    event: React.PointerEvent<HTMLElement>,
    mode: GanttDragMode
  ) => {
    if (!canUpdate || isPending) {
      return;
    }

    const anchorDate = getPointerDate(event, range, timelineRef.current);

    if (!anchorDate) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    timelineRef.current?.setPointerCapture(event.pointerId);
    setDragState({
      mode,
      anchorDate: toDateInputValue(anchorDate),
      originalStartDate: startDate || toDateInputValue(range.start),
      originalDueDate: dueDate || startDate || toDateInputValue(range.start),
    });
  };

  return (
    <div className="grid" style={gridStyle}>
      <HoverCard openDelay={150} closeDelay={120}>
        <HoverCardTrigger asChild>
          <div
            className="sticky left-0 z-10 flex min-w-0 cursor-pointer items-center gap-2 border-r bg-background px-3 py-2 hover:bg-accent/60"
            role="button"
            tabIndex={0}
            onClick={() => onOpenDetail(task.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onOpenDetail(task.id);
              }
            }}
          >
            {hasChildren ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={isCollapsed ? "子タスクを展開" : "子タスクを折りたたむ"}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleCollapse();
                }}
              >
                {isCollapsed ? (
                  <ChevronRightIcon data-icon="inline-start" />
                ) : (
                  <ChevronDownIcon data-icon="inline-start" />
                )}
              </Button>
            ) : (
              <span className="size-8 shrink-0" />
            )}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {task.parent_task_id ? (
                <span className="shrink-0 text-xs text-muted-foreground">└</span>
              ) : null}
              <span className="truncate text-sm font-medium">{task.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {task.task_code}
              </span>
            </div>
            <div className="flex shrink-0 gap-1">
              <TaskStatusBadge status={task.status} />
              <TaskFlagBadges
                isOverdue={task.is_overdue}
                isBlocked={task.is_blocked}
              />
            </div>
          </div>
        </HoverCardTrigger>
        <HoverCardContent side="right" align="start" className="w-72">
          <div className="flex flex-col gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{task.title}</p>
              <p className="text-xs text-muted-foreground">{task.task_code}</p>
            </div>
            <dl className="grid grid-cols-[4rem_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted-foreground">担当者</dt>
              <dd className="truncate">{assigneeLabel}</dd>
              <dt className="text-muted-foreground">進捗</dt>
              <dd>{task.progress_percent ?? 0}%</dd>
            </dl>
            <div className="flex flex-wrap gap-1">
              <TaskTypeBadge type={task.task_type} />
              <TaskPriorityBadge priority={task.priority} />
            </div>
            <TaskTags tags={task.tags} />
          </div>
        </HoverCardContent>
      </HoverCard>
      <div
        ref={timelineRef}
        className="relative py-4"
        onPointerMove={updateDraggedRange}
        onPointerUp={finishDrag}
        onPointerCancel={() => setDragState(null)}
        onDragOver={(event) => {
          if (!canUpdate || !hasDraggedUnscheduledTask(event.dataTransfer)) {
            return;
          }

          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          const hoverDate = getClientDate(
            event.clientX,
            range,
            timelineRef.current
          );

          if (hoverDate) {
            onDropDateHover(toDateInputValue(hoverDate));
          }
        }}
        onDrop={(event) => {
          if (!canUpdate) {
            return;
          }

          const taskId = getDraggedUnscheduledTaskId(event.dataTransfer);
          const droppedTask = unscheduledTasks.find(
            (candidate) => candidate.id === taskId
          );
          const dropDate = getClientDate(
            event.clientX,
            range,
            timelineRef.current
          );

          if (!droppedTask || !dropDate) {
            return;
          }

          event.preventDefault();
          onDropDateClear();
          onDropUnscheduledTask(droppedTask, dropDate).catch(() => undefined);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            onDropDateClear();
          }
        }}
      >
        <DropDateHighlight date={highlightedDropDate} range={range} />
        <WeekendBands range={range} />
        <GanttMilestoneLines milestones={milestones} range={range} />
        <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
        <TodayLine range={range} />
        <div
          className="relative h-3 rounded-full bg-primary/20 data-[editable=true]:cursor-grab data-[dragging=true]:cursor-grabbing"
          data-editable={canUpdate ? "true" : undefined}
          data-dragging={dragState?.mode === "move" ? "true" : undefined}
          style={plannedBarStyle}
          title={`${formatDate(startDate)} - ${formatDate(dueDate)}`}
          onPointerDown={(event) => startDrag(event, "move")}
        >
          <div
            className="h-full rounded-md bg-primary"
            style={{ width: `${task.progress_percent ?? 0}%` }}
          />
          {canUpdate ? (
            <>
              <button
                type="button"
                className="absolute top-0 bottom-0 left-0 w-2 cursor-ew-resize rounded-l-full bg-primary/80"
                aria-label={`${task.task_code}の開始日をドラッグで変更`}
                onPointerDown={(event) => startDrag(event, "start")}
              />
              <button
                type="button"
                className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize rounded-r-full bg-primary/80"
                aria-label={`${task.task_code}の終了予定日をドラッグで変更`}
                onPointerDown={(event) => startDrag(event, "end")}
              />
            </>
          ) : null}
        </div>
        {actualBarStyle ? (
          <div
            className="relative mt-1 h-1.5 rounded-full bg-foreground/60"
            style={actualBarStyle}
            title={`実績: ${formatDate(task.actual_start_date)} - ${formatDate(task.actual_end_date)}`}
          />
        ) : null}
      </div>
    </div>
  );
}

function GanttDependenciesSummary({
  tasks,
  dependencies,
}: {
  tasks: TaskRead[];
  dependencies: NonNullable<GanttResponse["dependencies"]>;
}) {
  const taskCodeById = new Map(tasks.map((task) => [task.id, task.task_code]));

  return (
    <div className="rounded-lg border p-3">
      <h3 className="mb-2 text-sm font-medium">依存関係</h3>
      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        {dependencies.map((dependency) => (
          <p key={dependency.id}>
            <span className="font-medium text-foreground">
              {taskCodeById.get(dependency.predecessor_task_id) ??
                `TASK-${dependency.predecessor_task_id}`}
            </span>
            <span className="mx-2">完了後に</span>
            <span className="font-medium text-foreground">
              {taskCodeById.get(dependency.successor_task_id) ??
                `TASK-${dependency.successor_task_id}`}
            </span>
            <span className="ml-2">を開始 / ラグ {dependency.lag_days}日</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function GanttMilestoneMarker({
  milestone,
  range,
  showLabel,
  canUpdate,
  onSelect,
}: {
  milestone: MilestoneRead;
  range: DateRange;
  showLabel: boolean;
  canUpdate: boolean;
  onSelect: (milestone: MilestoneRead) => void;
}) {
  const left = getMilestoneLeft(milestone, range);
  const title = getMilestoneTitle(milestone);

  return (
    <button
      type="button"
      className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
      style={{ left }}
      title={title}
      aria-label={title}
      disabled={!canUpdate}
      onClick={() => onSelect(milestone)}
    >
      <span
        className={cn(
          "size-3 rotate-45 rounded-[2px]",
          getMilestoneMarkerClassName(milestone.status)
        )}
      />
      {showLabel ? (
        <span className="max-w-28 truncate text-xs text-muted-foreground">
          {milestone.title}
        </span>
      ) : null}
    </button>
  );
}

function GanttMilestoneHeaderMarkers({
  milestones,
  range,
  canUpdate,
  onSelect,
}: {
  milestones: MilestoneRead[];
  range: DateRange;
  canUpdate: boolean;
  onSelect: (milestone: MilestoneRead) => void;
}) {
  return (
    <>
      <GanttMilestoneLines milestones={milestones} range={range} />
      {milestones.map((milestone) => {
        const title = getMilestoneTitle(milestone);

        return (
          <button
            key={milestone.id}
            type="button"
            className="absolute top-1 -translate-x-1/2"
            style={{ left: getMilestoneLeft(milestone, range) }}
            title={title}
            aria-label={title}
            disabled={!canUpdate}
            onClick={() => onSelect(milestone)}
          >
            <span
              className={cn(
                "block size-2.5 rotate-45 rounded-[2px]",
                getMilestoneMarkerClassName(milestone.status)
              )}
            />
          </button>
        );
      })}
    </>
  );
}

function GanttMilestoneLines({
  milestones,
  range,
}: {
  milestones: MilestoneRead[];
  range: DateRange;
}) {
  return (
    <>
      {milestones.map((milestone) => (
        <div
          key={milestone.id}
          className={cn(
            "pointer-events-none absolute top-0 bottom-0 w-px opacity-35",
            getMilestoneLineClassName(milestone.status)
          )}
          style={{ left: getMilestoneLeft(milestone, range) }}
          title={getMilestoneTitle(milestone)}
        />
      ))}
    </>
  );
}

function TodayLine({ range }: { range: DateRange }) {
  const todayLeft = getTodayLeft(range);

  if (!todayLeft) {
    return null;
  }

  return (
    <div
      className="absolute top-2 bottom-2 w-px bg-destructive"
      style={{ left: todayLeft }}
      title="今日"
    />
  );
}

function DropDateHighlight({
  date,
  range,
}: {
  date?: string | null;
  range: DateRange;
}) {
  if (!date) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 border-x border-primary/30 bg-primary/10"
      style={getDateColumnStyle(date, range)}
      title={`追加日: ${formatDate(date)}`}
    />
  );
}

function WeekendBands({ range }: { range: DateRange }) {
  const bands = getWeekendBands(range);

  return (
    <>
      {bands.map((band) => (
        <div
          key={band.key}
          className="absolute top-0 bottom-0 bg-muted/40"
          style={{ left: band.left, width: band.width }}
          title="休日"
        />
      ))}
    </>
  );
}

type DateRange = {
  start: Date;
  end: Date;
  labels: string[];
};

type GanttGridStyle = {
  gridTemplateColumns: string;
};

type GanttDisplayUnit = "day" | "week" | "month" | "quarter";
type GanttDragMode = "move" | "start" | "end";

type GanttDragState = {
  mode: GanttDragMode;
  anchorDate: string;
  originalStartDate: string;
  originalDueDate: string;
};

const UNSCHEDULED_TASK_DND_TYPE = "application/x-syncnesto-unscheduled-task";
const GANTT_TASK_COLUMN_WIDTH = 320;

const getDateRange = (
  tasks: TaskRead[],
  milestones: MilestoneRead[],
  displayUnit: GanttDisplayUnit
): DateRange | null => {
  const taskTimestamps = tasks
    .flatMap((task) => [
      task.start_date,
      task.due_date,
      task.actual_start_date,
      task.actual_end_date,
    ])
    .filter(Boolean)
    .map((value) => new Date(String(value)).getTime());
  const milestoneTimestamps = milestones.map((milestone) =>
    new Date(milestone.target_date).getTime()
  );
  const timestamps = [...taskTimestamps, ...milestoneTimestamps];

  if (!timestamps.length) {
    return null;
  }

  const start = new Date(Math.min(...timestamps));
  const end = new Date(Math.max(...timestamps));
  const labels = getDateLabels(start, end, displayUnit);

  return { start, end, labels };
};

const getFallbackDateRange = (displayUnit: GanttDisplayUnit): DateRange => {
  const start = getLocalToday();
  const end = new Date(start);
  const days = {
    day: 30,
    week: 84,
    month: 180,
    quarter: 365,
  }[displayUnit];

  end.setDate(start.getDate() + days);

  return {
    start,
    end,
    labels: getDateLabels(start, end, displayUnit),
  };
};

const getTimelineWidth = (range: DateRange, displayUnit: GanttDisplayUnit) => {
  const days = Math.max(daysBetween(range.start, range.end) + 1, 1);

  switch (displayUnit) {
    case "quarter":
      return Math.max(640, Math.ceil(days / 91) * 220);
    case "month":
      return Math.max(640, Math.ceil(days / 30) * 160);
    case "week":
      return Math.max(640, Math.ceil(days / 7) * 120);
    case "day":
    default:
      return Math.max(640, days * 28);
  }
};

const getDateCells = (range: DateRange) => {
  const cells: Array<{
    key: string;
    date: Date;
    isMonthStart: boolean;
    showMonthLabel: boolean;
    isWeekend: boolean;
    isToday: boolean;
  }> = [];
  const date = new Date(range.start);
  const today = getLocalToday();

  while (date <= range.end) {
    const cellDate = new Date(date);
    const isMonthStart = cellDate.getDate() === 1;

    cells.push({
      key: toDateInputValue(cellDate),
      date: cellDate,
      isMonthStart,
      showMonthLabel: isMonthStart || cells.length === 0,
      isWeekend: cellDate.getDay() === 0 || cellDate.getDay() === 6,
      isToday: toDateInputValue(cellDate) === toDateInputValue(today),
    });

    date.setDate(date.getDate() + 1);
  }

  return cells;
};

const daysBetween = (start: Date, end: Date) => {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round((end.getTime() - start.getTime()) / millisecondsPerDay);
};

const getInclusiveDays = (range: DateRange) => {
  return Math.max(daysBetween(range.start, range.end) + 1, 1);
};

const getPointerDate = (
  event: React.PointerEvent<HTMLElement>,
  range: DateRange,
  timeline: HTMLDivElement | null
) => {
  if (!timeline) {
    return null;
  }

  return getClientDate(event.clientX, range, timeline);
};

const getClientDate = (
  clientX: number,
  range: DateRange,
  timeline: HTMLElement | null
) => {
  if (!timeline) {
    return null;
  }

  const rect = timeline.getBoundingClientRect();
  const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  const totalDays = getInclusiveDays(range);
  const dayOffset = Math.min(Math.floor(ratio * totalDays), totalDays - 1);
  const date = new Date(range.start);

  date.setDate(range.start.getDate() + dayOffset);

  return date;
};

const hasDraggedUnscheduledTask = (dataTransfer: DataTransfer) => {
  return Array.from(dataTransfer.types).includes(UNSCHEDULED_TASK_DND_TYPE);
};

const getDraggedUnscheduledTaskId = (dataTransfer: DataTransfer) => {
  const taskId = Number(dataTransfer.getData(UNSCHEDULED_TASK_DND_TYPE));

  return Number.isFinite(taskId) ? taskId : null;
};

const setUnscheduledTaskDragImage = (
  event: React.DragEvent<HTMLElement>,
  task: TaskRead
) => {
  const preview = document.createElement("div");

  preview.textContent = task.title;
  preview.className =
    "pointer-events-none fixed max-w-56 truncate rounded-lg border bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-lg";
  preview.style.top = "-1000px";
  preview.style.left = "-1000px";

  document.body.appendChild(preview);
  event.dataTransfer.setDragImage(preview, 12, 12);
  window.setTimeout(() => preview.remove(), 0);
};

const getDraggedDateRange = (state: GanttDragState, pointedDate: Date) => {
  if (state.mode === "start") {
    return {
      startDate: minDateInput(pointedDate, state.originalDueDate),
      dueDate: state.originalDueDate,
    };
  }

  if (state.mode === "end") {
    return {
      startDate: state.originalStartDate,
      dueDate: maxDateInput(pointedDate, state.originalStartDate),
    };
  }

  const deltaDays = daysBetween(new Date(state.anchorDate), pointedDate);

  return {
    startDate: shiftDateInput(state.originalStartDate, deltaDays),
    dueDate: shiftDateInput(state.originalDueDate, deltaDays),
  };
};

const isScheduleDirty = (
  task: TaskRead,
  startDate: string,
  dueDate: string
) => {
  return startDate !== (task.start_date ?? "") || dueDate !== (task.due_date ?? "");
};

const shiftDateInput = (dateInput: string, days: number) => {
  const date = new Date(dateInput);

  date.setDate(date.getDate() + days);

  return toDateInputValue(date);
};

const minDateInput = (date: Date, maxDateInput: string) => {
  const maxDate = new Date(maxDateInput);

  return toDateInputValue(date > maxDate ? maxDate : date);
};

const maxDateInput = (date: Date, minDateInput: string) => {
  const minDate = new Date(minDateInput);

  return toDateInputValue(date < minDate ? minDate : date);
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getLocalToday = () => {
  const today = new Date();

  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};

const getTimelineBarStyle = (start: Date, end: Date, range: DateRange) => {
  const totalDays = getInclusiveDays(range);
  const offset = Math.max(daysBetween(range.start, start), 0);
  const duration = Math.max(daysBetween(start, end) + 1, 1);

  return {
    left: `${Math.min((offset / totalDays) * 100, 100)}%`,
    width: `${Math.min((duration / totalDays) * 100, 100)}%`,
  };
};

const getActualBarStyle = (task: TaskRead, range: DateRange) => {
  if (!task.actual_start_date && !task.actual_end_date) {
    return null;
  }

  const actualStart = task.actual_start_date
    ? new Date(task.actual_start_date)
    : task.actual_end_date
      ? new Date(task.actual_end_date)
      : range.start;
  const actualEnd = task.actual_end_date ? new Date(task.actual_end_date) : actualStart;

  return getTimelineBarStyle(actualStart, actualEnd, range);
};

const getWeekendBands = (range: DateRange) => {
  const totalDays = getInclusiveDays(range);
  const bands: Array<{ key: string; left: string; width: string }> = [];
  const date = new Date(range.start);

  while (date <= range.end) {
    const day = date.getDay();

    if (day === 0 || day === 6) {
      const offset = Math.max(daysBetween(range.start, date), 0);
      const key = toDateInputValue(date);

      bands.push({
        key,
        left: `${(offset / totalDays) * 100}%`,
        width: `${(1 / totalDays) * 100}%`,
      });
    }

    date.setDate(date.getDate() + 1);
  }

  return bands;
};

const getDateColumnStyle = (dateInput: string, range: DateRange) => {
  const totalDays = getInclusiveDays(range);
  const date = new Date(dateInput);
  const offset = Math.min(
    Math.max(daysBetween(range.start, date), 0),
    totalDays - 1
  );

  return {
    left: `${(offset / totalDays) * 100}%`,
    width: `${(1 / totalDays) * 100}%`,
  };
};

const getTodayLeft = (range: DateRange) => {
  const today = new Date();

  if (today < range.start || today > range.end) {
    return null;
  }

  const totalDays = getInclusiveDays(range);
  const offset = Math.max(daysBetween(range.start, today), 0);

  return `${Math.min((offset / totalDays) * 100, 100)}%`;
};

const getMilestoneLeft = (milestone: MilestoneRead, range: DateRange) => {
  const targetDate = new Date(milestone.target_date);
  const totalDays = getInclusiveDays(range);
  const offset = Math.max(daysBetween(range.start, targetDate), 0);

  return `${Math.min((offset / totalDays) * 100, 100)}%`;
};

const getMilestoneTitle = (milestone: MilestoneRead) => {
  return `${milestone.title} / ${formatDate(milestone.target_date)} / ${getMilestoneStatusLabel(milestone.status)}`;
};

const getMilestoneMarkerClassName = (status?: string | null) => {
  return cn(
    "bg-[var(--status-warning-fg)]",
    status === "achieved" && "bg-[var(--status-success-fg)]",
    status === "missed" && "bg-[var(--status-danger-fg)]",
    status === "cancelled" && "bg-[var(--status-neutral-fg)]"
  );
};

const getMilestoneLineClassName = (status?: string | null) => {
  return cn(
    "bg-[var(--status-warning-border)]",
    status === "achieved" && "bg-[var(--status-success-border)]",
    status === "missed" && "bg-[var(--status-danger-border)]",
    status === "cancelled" && "bg-[var(--status-neutral-border)]"
  );
};

const getDateLabels = (
  start: Date,
  end: Date,
  displayUnit: GanttDisplayUnit
) => {
  const labelCount = getLabelCount(displayUnit);
  const rangeDays = Math.max(daysBetween(start, end), 1);

  return Array.from({ length: labelCount }).map((_, index) => {
    const date = new Date(start);
    date.setDate(
      start.getDate() + Math.round((rangeDays / Math.max(labelCount - 1, 1)) * index)
    );

    switch (displayUnit) {
      case "week":
        return `${date.getFullYear()}/W${getWeekNumber(date)}`;
      case "month":
        return `${date.getFullYear()}/${date.getMonth() + 1}`;
      case "quarter":
        return `${date.getFullYear()}/Q${Math.floor(date.getMonth() / 3) + 1}`;
      case "day":
      default:
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  });
};

const getLabelCount = (displayUnit: GanttDisplayUnit) => {
  switch (displayUnit) {
    case "month":
      return 6;
    case "quarter":
      return 4;
    case "week":
    case "day":
    default:
      return 7;
  }
};

const getWeekNumber = (date: Date) => {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor(
    (date.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000)
  );

  return Math.ceil((days + firstDay.getDay() + 1) / 7);
};

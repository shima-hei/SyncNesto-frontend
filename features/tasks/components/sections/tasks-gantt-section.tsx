"use client";

import { useRef, useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PanelRightOpenIcon,
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

import { useUpdateTaskQuick } from "../../hooks/use-update-task-quick";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { GanttDependenciesSummary } from "../gantt/gantt-dependencies-summary";
import {
  DropDateHighlight,
  GanttMilestoneLines,
  GanttMilestoneMarker,
  TodayLine,
  WeekendBands,
} from "../gantt/gantt-timeline-overlays";
import {
  GanttDroppableTimeline,
  GanttTimelineHeader,
  GanttUnscheduledDropLane,
} from "../gantt/gantt-timeline-grid";
import { UnscheduledTasksPanel } from "../gantt/unscheduled-tasks-panel";
import {
  TaskFlagBadges,
  TaskPriorityBadge,
  TaskStatusBadge,
  TaskTags,
  TaskTypeBadge,
} from "../shared/task-badges";
import {
  GANTT_TASK_COLUMN_WIDTH,
  type DateRange,
  type GanttDisplayUnit,
  type GanttDragMode,
  type GanttDragState,
  type GanttGridStyle,
  getActualBarStyle,
  getClientDate,
  getDateRange,
  getDraggedDateRange,
  getFallbackDateRange,
  getPointerDate,
  getTimelineBarStyle,
  getTimelineWidth,
  isScheduleDirty,
  toDateInputValue,
} from "../../lib/gantt-timeline";
import {
  getDraggedUnscheduledTaskId,
  hasDraggedUnscheduledTask,
} from "../../lib/task-gantt-dnd";
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
  const [draggingUnscheduledTaskId, setDraggingUnscheduledTaskId] = useState<
    number | null
  >(null);
  const [highlightedDropDate, setHighlightedDropDate] = useState<string | null>(
    null,
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
    (task) => !task.start_date && !task.due_date,
  );
  const visibleMilestones = milestones.filter(
    (milestone) => milestone.target_date,
  );
  const range =
    getDateRange(visibleTasks, visibleMilestones, displayUnit) ??
    (unscheduledTasks.length ? getFallbackDateRange(displayUnit) : null);
  const parentTaskIds = new Set(
    visibleTasks
      .map((task) => task.parent_task_id)
      .filter((taskId): taskId is number => Boolean(taskId)),
  );
  const displayedTasks = visibleTasks.filter(
    (task) =>
      !task.parent_task_id || !collapsedTaskIds.includes(task.parent_task_id),
  );
  const timelineWidth = range ? getTimelineWidth(range, displayUnit) : 0;
  const ganttWidth = GANTT_TASK_COLUMN_WIDTH + timelineWidth;
  const ganttGridStyle = {
    gridTemplateColumns: `${GANTT_TASK_COLUMN_WIDTH}px ${timelineWidth}px`,
  };
  const dropUnscheduledTask = (
    task: TaskRead,
    dropDate: Date,
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
                        : [...current, task.id],
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
                    isDropEnabled={
                      canUpdate && Boolean(unscheduledTasks.length)
                    }
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
  onDropUnscheduledTask: (task: TaskRead, dropDate: Date) => Promise<unknown>;
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
    mode: GanttDragMode,
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
                aria-label={
                  isCollapsed ? "子タスクを展開" : "子タスクを折りたたむ"
                }
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
                <span className="shrink-0 text-xs text-muted-foreground">
                  └
                </span>
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
            timelineRef.current,
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
            (candidate) => candidate.id === taskId,
          );
          const dropDate = getClientDate(
            event.clientX,
            range,
            timelineRef.current,
          );

          if (!droppedTask || !dropDate) {
            return;
          }

          event.preventDefault();
          onDropDateClear();
          onDropUnscheduledTask(droppedTask, dropDate).catch(() => undefined);
        }}
        onDragLeave={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
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

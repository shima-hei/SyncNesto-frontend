"use client";

import { useRef, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  GanttResponse,
  MilestoneRead,
  PhaseRead,
  TaskRead,
} from "@/lib/api/generated/model";
import {
  formatDate,
  toCalendarDate,
  toCalendarDateInput,
} from "@/lib/format/date";

import {
  groupPlanningTasks,
  getPlanningPhaseKey,
  getPlanningPhaseLabels,
  getGanttTaskTree,
  type GanttTaskNode,
} from "../../lib/planning-phases";
import { useGanttOrder } from "../../hooks/use-gantt-order";
import type { TaskPlanningController } from "../../hooks/use-task-planning";
import {
  getTaskPlanningValues,
  overlayPlanningTask,
} from "../../lib/task-planning";
import { getTodayGanttRange } from "../../lib/gantt-range-controls";
import {
  GANTT_COLUMNS,
  GanttAssigneeCell,
  GanttPlanningCells,
} from "../gantt/gantt-planning-cells";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import {
  GANTT_ORDER_ROW,
  GanttOrderHandle,
  type GanttOrderControl,
} from "../gantt/gantt-order-handle";
import { GanttDependencyBadge } from "../gantt/gantt-dependency-badge";
import {
  getGanttDependencyWarnings,
  type GanttDependencyWarning,
} from "../../lib/gantt-dependency-warnings";
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
import { cn } from "@/lib/utils";
import { getTaskStatusLabel } from "../../constants/task-options";
import {
  type DateRange,
  type GanttDisplayUnit,
  type GanttDragMode,
  type GanttDragState,
  type GanttGridStyle,
  getActualBarStyle,
  getClientDate,
  getDateRange,
  getDraggedDateRange,
  getGanttDisplayRange,
  getPointerDate,
  getTimelineBarStyle,
  getTimelineWidth,
} from "../../lib/gantt-timeline";
import {
  getDraggedUnscheduledTaskId,
  hasDraggedUnscheduledTask,
} from "../../lib/task-gantt-dnd";
import { TaskDetailSheet } from "./task-detail-sheet";

type TasksGanttSectionProps = {
  projectId: number;
  gantt: GanttResponse | null;
  dependencyTasks?: TaskRead[];
  phases: PhaseRead[];
  isLoading: boolean;
  displayUnit: GanttDisplayUnit;
  displayStart: string;
  displayEnd: string;
  canUpdate: boolean;
  canReorderPhases: boolean;
  planning: TaskPlanningController;
  unscheduledPanelOpen: boolean;
  onCloseUnscheduled: () => void;
  onMilestoneSelect: (milestone: MilestoneRead) => void;
};

export function TasksGanttSection({
  projectId,
  gantt,
  dependencyTasks,
  phases,
  isLoading,
  displayUnit,
  displayStart,
  displayEnd,
  canUpdate,
  canReorderPhases,
  planning,
  unscheduledPanelOpen,
  onCloseUnscheduled,
  onMilestoneSelect,
}: TasksGanttSectionProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<number[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const openTaskDetail = (taskId: number, trigger: HTMLButtonElement) => {
    detailTrigger.current = trigger;
    setSelectedTaskId(taskId);
  };
  const [draggingUnscheduledTaskId, setDraggingUnscheduledTaskId] = useState<
    number | null
  >(null);
  const [highlightedDropDate, setHighlightedDropDate] = useState<string | null>(
    null,
  );
  const [dragRange, setDragRange] = useState<DateRange | null>(null);
  const { usersById, getTaskUserLabel } = useTaskUserMap(projectId);
  const order = useGanttOrder(projectId);

  if (isLoading) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        ガントチャートを読み込んでいます。
      </div>
    );
  }

  const tasks = (gantt?.tasks ?? []).map((task) =>
    planning.rows[task.id]
      ? overlayPlanningTask(task, planning.rows[task.id].values)
      : task,
  );
  const dependencies = gantt?.dependencies ?? [];
  const dependencySnapshot = new Map(
    dependencyTasks?.map((task) => [task.id, task]),
  );
  for (const task of gantt?.tasks ?? []) {
    const previous = dependencySnapshot.get(task.id);
    if (!previous || previous.version <= task.version)
      dependencySnapshot.set(task.id, task);
  }
  const saved = planning.lastSaved?.task;
  const savedBaseline = saved && dependencySnapshot.get(saved.id);
  if (saved && savedBaseline && savedBaseline.version < saved.version)
    dependencySnapshot.set(saved.id, saved);
  for (const row of Object.values(planning.rows)) {
    const task = dependencySnapshot.get(row.baseline.id);
    if (task)
      dependencySnapshot.set(task.id, overlayPlanningTask(task, row.values));
  }
  const dependencyWarnings = getGanttDependencyWarnings(
    dependencySnapshot.values(),
    dependencies,
  );
  const milestones = gantt?.milestones ?? [];
  const visibleTasks = tasks.filter((task) => task.start_date || task.due_date);
  const unscheduledTasks = tasks.filter(
    (task) => !task.start_date && !task.due_date,
  );
  const range =
    dragRange ??
    getGanttDisplayRange(
      getDateRange(visibleTasks, milestones),
      displayStart,
      displayEnd,
      getTodayGanttRange(displayUnit),
    );
  const visibleMilestones = milestones.filter((milestone) => {
    const date = new Date(milestone.target_date);
    return date >= range.start && date <= range.end;
  });
  const parentTaskIds = new Set(
    visibleTasks
      .map((task) => task.parent_task_id)
      .filter((taskId): taskId is number => Boolean(taskId)),
  );
  const visibleById = new Map(visibleTasks.map((task) => [task.id, task]));
  const collapsed = new Set(collapsedTaskIds);
  const displayedTasks = visibleTasks.filter((task) => {
    let parentId = task.parent_task_id;
    while (parentId) {
      if (collapsed.has(parentId)) return false;
      parentId = visibleById.get(parentId)?.parent_task_id;
    }
    return true;
  });
  const groups = groupPlanningTasks(displayedTasks, phases);
  const phaseIdsByKey = new Map(
    phases.map((phase) => [`phase:${phase.id}`, phase.id]),
  );
  const displayedPhaseIds = groups.flatMap((group) => {
    const id = phaseIdsByKey.get(group.key);
    return id === undefined ? [] : [id];
  });
  const getOrderControl = (
    kind: "phase" | "task",
    group: string,
    id: number,
    label: string,
    ids: number[],
  ): GanttOrderControl | undefined => {
    if (ids.length < 2) return;
    const index = ids.indexOf(id);
    return {
      id,
      group,
      label,
      previous: ids[index - 1],
      next: ids[index + 1],
      disabled: order.isPending || Boolean(dragRange),
      save: (move, name, trigger) =>
        order.mutate({ kind, move, label: name, trigger }),
    };
  };
  const phaseLabels = getPlanningPhaseLabels(phases);
  const timelineWidth = getTimelineWidth(range, displayUnit);
  const ganttGridStyle = {
    gridTemplateColumns: `var(--gantt-task-width) minmax(${timelineWidth}px, 1fr)`,
  };
  const dropUnscheduledTask = (
    task: TaskRead,
    dropDate: Date,
  ): Promise<unknown> => {
    const startDate = toCalendarDateInput(dropDate);

    setDraggingUnscheduledTaskId(null);
    setHighlightedDropDate(null);
    return planning.commit(task, { startDate, dueDate: startDate });
  };
  const clearUnscheduledDragState = () => {
    setDraggingUnscheduledTaskId(null);
    setHighlightedDropDate(null);
  };

  const renderTaskRows = (nodes: GanttTaskNode[], phaseKey: string) => {
    const siblingsByParent = new Map<number | null, number[]>();
    for (const { task } of nodes) {
      const parentId = task.parent_task_id ?? null;
      const siblings = siblingsByParent.get(parentId) ?? [];
      siblings.push(task.id);
      siblingsByParent.set(parentId, siblings);
    }
    return nodes.map(({ task, children }) => {
      const parentId = task.parent_task_id ?? null;
      const orderControl = canUpdate
        ? getOrderControl(
            "task",
            `task:${phaseKey}:${parentId ?? "root"}`,
            task.id,
            task.title,
            siblingsByParent.get(parentId) ?? [],
          )
        : undefined;
      return (
        <div
          key={task.id}
          data-gantt-order-group={orderControl?.group}
          data-gantt-order-id={orderControl?.id}
          className={cn("divide-y", GANTT_ORDER_ROW)}
        >
          <GanttTaskRow
            task={task}
            warnings={dependencyWarnings.get(task.id) ?? []}
            range={range}
            milestones={visibleMilestones}
            gridStyle={ganttGridStyle}
            assigneeLabel={
              task.assignee_id ? getTaskUserLabel(task.assignee_id) : "未割当"
            }
            assigneeAvatarUrl={
              task.assignee_id
                ? usersById.get(task.assignee_id)?.avatar_url
                : undefined
            }
            orderControl={orderControl}
            highlightedDropDate={highlightedDropDate}
            unscheduledTasks={unscheduledTasks}
            hasChildren={parentTaskIds.has(task.id)}
            isCollapsed={collapsedTaskIds.includes(task.id)}
            canUpdate={
              canUpdate &&
              !planning.pendingDraft &&
              !["pending", "unknown", "conflict"].includes(
                planning.rows[task.id]?.status ?? "",
              )
            }
            planning={planning}
            canEditPlanning={canUpdate}
            onToggleCollapse={() =>
              setCollapsedTaskIds((current) =>
                current.includes(task.id)
                  ? current.filter((taskId) => taskId !== task.id)
                  : [...current, task.id],
              )
            }
            onScheduleUpdate={(values) => planning.edit(task, values)}
            onDragActive={(active) => setDragRange(active ? range : null)}
            onOpenDetail={openTaskDetail}
            onDropUnscheduledTask={(task, dropDate) =>
              dropUnscheduledTask(task, dropDate)
            }
            onDropDateHover={setHighlightedDropDate}
            onDropDateClear={() => setHighlightedDropDate(null)}
          />
          {!collapsedTaskIds.includes(task.id) &&
            renderTaskRows(children, phaseKey)}
        </div>
      );
    });
  };

  return (
    <div className="@container flex flex-col gap-3">
      <UnscheduledTasksPanel
        open={unscheduledPanelOpen}
        tasks={unscheduledTasks}
        isPending={Boolean(planning.pendingDraft)}
        canUpdate={canUpdate}
        getPhaseLabel={(task) =>
          phaseLabels.get(getPlanningPhaseKey(task)) ?? `工程 #${task.phase_id}`
        }
        onEditPlanning={canUpdate ? planning.openEditor : undefined}
        onClose={() => {
          clearUnscheduledDragState();
          onCloseUnscheduled();
        }}
        onOpenDetail={openTaskDetail}
        onDragStart={setDraggingUnscheduledTaskId}
        onDragEnd={clearUnscheduledDragState}
        onAddToday={(task) =>
          dropUnscheduledTask(task, toCalendarDate(new Date()))
        }
      />
      <div
        role="region"
        data-gantt-scroll=""
        aria-label="ガントの日程表"
        tabIndex={0}
        className="max-h-[min(68dvh,52rem)] overflow-auto rounded-lg border data-[gantt-reordering]:cursor-grabbing [--gantt-task-width:min(17rem,65cqi)] @min-[50rem]:[--gantt-task-width:min(39rem,56cqi)] focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div
          style={{
            minWidth: `calc(var(--gantt-task-width) + ${timelineWidth}px)`,
          }}
        >
          <div
            className="sticky top-0 z-30 grid border-b bg-muted text-xs font-medium text-muted-foreground"
            style={ganttGridStyle}
          >
            <div
              className={cn(
                "sticky left-0 z-10 grid items-center gap-1 border-r bg-muted px-2 py-2",
                GANTT_COLUMNS,
              )}
            >
              <span className="col-span-4 @min-[50rem]:col-span-1">タスク</span>
              <span className="hidden px-1.5 @min-[50rem]:block">担当者</span>
              <span className="hidden px-1.5 @min-[50rem]:block">
                状態・進捗
              </span>
              <span className="hidden px-1.5 @min-[50rem]:block">予定期間</span>
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
            {groups.map((group) => {
              const phaseId = phaseIdsByKey.get(group.key);
              const orderControl =
                canReorderPhases && phaseId !== undefined
                  ? getOrderControl(
                      "phase",
                      "phases",
                      phaseId,
                      group.label,
                      displayedPhaseIds,
                    )
                  : undefined;
              return (
                <div
                  key={group.key}
                  data-gantt-order-group={orderControl?.group}
                  data-gantt-order-id={orderControl?.id}
                  className={cn("divide-y", GANTT_ORDER_ROW)}
                >
                  <div
                    className="grid border-b bg-muted/40"
                    style={ganttGridStyle}
                  >
                    <div className="sticky left-0 z-10 flex min-w-0 items-center gap-0.5 border-r bg-muted px-2 py-1.5">
                      {orderControl && <GanttOrderHandle {...orderControl} />}
                      <h3 className="min-w-0 break-words text-sm font-medium">
                        <button
                          type="button"
                          aria-expanded={!collapsedGroups.has(group.key)}
                          className="flex min-w-0 items-center gap-1 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-ring"
                          onClick={() =>
                            setCollapsedGroups((previous) => {
                              const next = new Set(previous);
                              if (next.has(group.key)) next.delete(group.key);
                              else next.add(group.key);
                              return next;
                            })
                          }
                        >
                          {collapsedGroups.has(group.key) ? (
                            <ChevronRightIcon className="size-4" />
                          ) : (
                            <ChevronDownIcon className="size-4" />
                          )}
                          {group.label}
                        </button>
                      </h3>
                    </div>
                  </div>
                  {!collapsedGroups.has(group.key) &&
                    renderTaskRows(getGanttTaskTree(group.tasks), group.key)}
                </div>
              );
            })}
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
      <TaskDetailSheet
        projectId={projectId}
        taskId={selectedTaskId}
        triggerRef={detailTrigger}
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
  warnings,
  range,
  milestones,
  gridStyle,
  assigneeLabel,
  assigneeAvatarUrl,
  orderControl,
  highlightedDropDate,
  unscheduledTasks,
  hasChildren,
  isCollapsed,
  canUpdate,
  planning,
  canEditPlanning,
  onToggleCollapse,
  onScheduleUpdate,
  onDragActive,
  onOpenDetail,
  onDropUnscheduledTask,
  onDropDateHover,
  onDropDateClear,
}: {
  task: TaskRead;
  warnings: readonly GanttDependencyWarning[];
  range: DateRange;
  milestones: MilestoneRead[];
  gridStyle: GanttGridStyle;
  assigneeLabel: string;
  assigneeAvatarUrl?: string | null;
  orderControl?: GanttOrderControl;
  highlightedDropDate: string | null;
  unscheduledTasks: TaskRead[];
  hasChildren: boolean;
  isCollapsed: boolean;
  canUpdate: boolean;
  planning: TaskPlanningController;
  canEditPlanning: boolean;
  onToggleCollapse: () => void;
  onScheduleUpdate: (values: { startDate?: string; dueDate?: string }) => void;
  onDragActive: (active: boolean) => void;
  onOpenDetail: (taskId: number, trigger: HTMLButtonElement) => void;
  onDropUnscheduledTask: (task: TaskRead, dropDate: Date) => Promise<unknown>;
  onDropDateHover: (date: string | null) => void;
  onDropDateClear: () => void;
}) {
  const { startDate, dueDate } =
    planning.rows[task.id]?.values ?? getTaskPlanningValues(task);
  const [dragState, setDragState] = useState<GanttDragState | null>(null);
  const beforeDragDates = useRef({ startDate, dueDate, autoSave: false });
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const dragMoved = useRef(false);
  const start = new Date(startDate || dueDate);
  const end = new Date(dueDate || startDate);
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

    if (
      !dragMoved.current &&
      toCalendarDateInput(pointedDate) === dragState.anchorDate
    )
      return;
    dragMoved.current = true;
    const nextRange = getDraggedDateRange(dragState, pointedDate);

    onScheduleUpdate(nextRange);
  };
  const finishDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (!dragState) {
      return;
    }

    const pointedDate = getPointerDate(event, range, timelineRef.current);
    const nextRange = pointedDate
      ? getDraggedDateRange(dragState, pointedDate)
      : { startDate, dueDate };

    if (
      dragMoved.current ||
      (pointedDate && toCalendarDateInput(pointedDate) !== dragState.anchorDate)
    ) {
      onScheduleUpdate(nextRange);
      if (beforeDragDates.current.autoSave) void planning.save(task);
    }
    setDragState(null);
    onDragActive(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  const startDrag = (
    event: React.PointerEvent<HTMLElement>,
    mode: GanttDragMode,
  ) => {
    if (!canUpdate) {
      return;
    }

    const anchorDate = getPointerDate(event, range, timelineRef.current);

    if (!anchorDate) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    timelineRef.current?.setPointerCapture(event.pointerId);
    dragMoved.current = false;
    beforeDragDates.current = {
      startDate,
      dueDate,
      autoSave: !planning.rows[task.id],
    };
    onDragActive(true);
    setDragState({
      mode,
      anchorDate: toCalendarDateInput(anchorDate),
      originalStartDate: startDate || dueDate,
      originalDueDate: dueDate || startDate,
    });
  };

  return (
    <div className="grid" style={gridStyle}>
      <div className="sticky left-0 z-10 min-w-0 border-r bg-background px-2 py-1">
        <div
          className={cn(
            "hidden min-h-8 items-center gap-1 @min-[50rem]:grid",
            GANTT_COLUMNS,
          )}
        >
          <GanttRowTitle
            task={task}
            orderControl={orderControl}
            warnings={warnings}
            hasChildren={hasChildren}
            isCollapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
            onOpenDetail={onOpenDetail}
          />
          <GanttPlanningCells
            task={task}
            planning={planning}
            editable={canUpdate}
          >
            <GanttAssigneeCell
              task={task}
              planning={planning}
              editable={canUpdate}
              name={assigneeLabel}
              avatarUrl={assigneeAvatarUrl}
            />
          </GanttPlanningCells>
        </div>
        <div className="flex min-w-0 flex-col gap-1 @min-[50rem]:hidden">
          <GanttRowTitle
            task={task}
            orderControl={orderControl}
            warnings={warnings}
            hasChildren={hasChildren}
            isCollapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
            onOpenDetail={onOpenDetail}
          />
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <GanttAssigneeCell
              task={task}
              planning={planning}
              editable={canUpdate}
              name={assigneeLabel}
              avatarUrl={assigneeAvatarUrl}
            />
            <span>
              {getTaskStatusLabel(task.status)} {task.progress_percent}%
            </span>
            {canEditPlanning ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7"
                onClick={(event) =>
                  planning.openEditor(task, event.currentTarget)
                }
              >
                計画を編集
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <div
        ref={timelineRef}
        className="relative flex flex-col justify-center py-2"
        onPointerMove={updateDraggedRange}
        onPointerUp={finishDrag}
        onPointerCancel={() => {
          if (dragState) {
            const { startDate, dueDate } = beforeDragDates.current;
            onScheduleUpdate({ startDate, dueDate });
          }
          setDragState(null);
          onDragActive(false);
        }}
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
            onDropDateHover(toCalendarDateInput(hoverDate));
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
        {plannedBarStyle ? (
          <div
            className="relative h-4 rounded-md bg-primary/25 data-[editable=true]:cursor-grab data-[dragging=true]:cursor-grabbing"
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
                {start >= range.start ? (
                  <button
                    type="button"
                    className="absolute top-0 bottom-0 left-0 w-2 cursor-ew-resize rounded-l-full bg-primary/80"
                    aria-label={`${task.task_code}の開始日をドラッグで変更`}
                    onPointerDown={(event) => startDrag(event, "start")}
                  />
                ) : null}
                {end <= range.end ? (
                  <button
                    type="button"
                    className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize rounded-r-full bg-primary/80"
                    aria-label={`${task.task_code}の終了予定日をドラッグで変更`}
                    onPointerDown={(event) => startDrag(event, "end")}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
        {actualBarStyle ? (
          <div
            className="pointer-events-none absolute bottom-1 h-1 rounded-full bg-foreground/60"
            style={actualBarStyle}
            title={`実績: ${formatDate(task.actual_start_date)} - ${formatDate(task.actual_end_date)}`}
          />
        ) : null}
      </div>
    </div>
  );
}

function GanttRowTitle({
  task,
  orderControl,
  warnings,
  hasChildren,
  isCollapsed,
  onToggleCollapse,
  onOpenDetail,
}: {
  task: TaskRead;
  orderControl?: GanttOrderControl;
  warnings: readonly GanttDependencyWarning[];
  hasChildren: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenDetail: (taskId: number, trigger: HTMLButtonElement) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-0.5">
      {orderControl && <GanttOrderHandle {...orderControl} />}
      {hasChildren ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7 shrink-0"
          aria-label={isCollapsed ? "子タスクを展開" : "子タスクを折りたたむ"}
          aria-expanded={!isCollapsed}
          onClick={onToggleCollapse}
        >
          {isCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
        </Button>
      ) : task.parent_task_id ? (
        <span
          aria-hidden
          className="w-3 shrink-0 text-xs text-muted-foreground"
        >
          └
        </span>
      ) : null}
      <button
        type="button"
        aria-haspopup="dialog"
        title={`${task.task_code} ${task.title}`}
        className="min-w-0 flex-1 rounded-sm px-1 py-1 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
        onClick={(event) => onOpenDetail(task.id, event.currentTarget)}
      >
        <span className="block truncate text-sm font-medium">{task.title}</span>
        <span className="sr-only"> {task.task_code}</span>
      </button>
      {warnings.length ? (
        <GanttDependencyBadge
          taskLabel={task.task_code || task.title}
          warnings={warnings}
        />
      ) : null}
    </div>
  );
}

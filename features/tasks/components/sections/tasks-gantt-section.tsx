"use client";

import { useRef, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  GanttResponse,
  MilestoneRead,
  TaskRead,
} from "@/lib/api/generated/model";
import { formatDate } from "@/lib/format/date";

import { useUpdateTaskQuick } from "../../hooks/use-update-task-quick";
import { TaskFlagBadges, TaskStatusBadge } from "../shared/task-badges";

type TasksGanttSectionProps = {
  projectId: number;
  gantt: GanttResponse | null;
  isLoading: boolean;
  displayUnit: GanttDisplayUnit;
  canUpdate: boolean;
};

export function TasksGanttSection({
  projectId,
  gantt,
  isLoading,
  displayUnit,
  canUpdate,
}: TasksGanttSectionProps) {
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<number[]>([]);
  const { updateTaskQuick, isPending } = useUpdateTaskQuick(projectId);

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
  const visibleMilestones = milestones.filter((milestone) => milestone.target_date);
  const range = getDateRange(visibleTasks, visibleMilestones, displayUnit);
  const parentTaskIds = new Set(
    visibleTasks
      .map((task) => task.parent_task_id)
      .filter((taskId): taskId is number => Boolean(taskId))
  );
  const displayedTasks = visibleTasks.filter(
    (task) =>
      !task.parent_task_id || !collapsedTaskIds.includes(task.parent_task_id)
  );

  if ((!visibleTasks.length && !visibleMilestones.length) || !range) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        開始日、終了予定日、またはマイルストーンが設定されていません。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[260px_1fr] border-b bg-muted/40 text-xs text-muted-foreground">
            <div className="px-3 py-2">タスク</div>
            <div
              className="grid px-3 py-2"
              style={{
                gridTemplateColumns: `repeat(${range.labels.length}, minmax(0, 1fr))`,
              }}
            >
              {range.labels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
          <div className="divide-y">
            {displayedTasks.map((task) => (
              <GanttTaskRow
                key={`${task.id}-${task.version}-${task.start_date ?? "none"}-${task.due_date ?? "none"}`}
                task={task}
                range={range}
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
              />
            ))}
            {visibleMilestones.length ? (
              <div className="grid grid-cols-[260px_1fr] bg-muted/20">
                <div className="px-3 py-2 text-sm font-medium">マイルストーン</div>
                <div className="relative px-3 py-4">
                  <WeekendBands range={range} />
                  <div className="absolute inset-x-3 top-1/2 h-px bg-border" />
                  <TodayLine range={range} />
                  {visibleMilestones.map((milestone) => (
                    <GanttMilestoneMarker
                      key={milestone.id}
                      milestone={milestone}
                      range={range}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {dependencies.length ? (
        <GanttDependenciesSummary tasks={tasks} dependencies={dependencies} />
      ) : null}
    </div>
  );
}

function GanttTaskRow({
  task,
  range,
  hasChildren,
  isCollapsed,
  canUpdate,
  isPending,
  onToggleCollapse,
  onScheduleUpdate,
}: {
  task: TaskRead;
  range: DateRange;
  hasChildren: boolean;
  isCollapsed: boolean;
  canUpdate: boolean;
  isPending: boolean;
  onToggleCollapse: () => void;
  onScheduleUpdate: (values: {
    startDate?: string;
    dueDate?: string;
  }) => Promise<unknown>;
}) {
  const [startDate, setStartDate] = useState(task.start_date ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [dragState, setDragState] = useState<GanttDragState | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const start = startDate ? new Date(startDate) : range.start;
  const end = dueDate ? new Date(dueDate) : start;
  const plannedBarStyle = getTimelineBarStyle(start, end, range);
  const actualBarStyle = getActualBarStyle(task, range);
  const isDirty =
    startDate !== (task.start_date ?? "") || dueDate !== (task.due_date ?? "");
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
    <div className="grid grid-cols-[260px_1fr]">
      <div className="flex min-w-0 flex-col gap-1 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {hasChildren ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={isCollapsed ? "子タスクを展開" : "子タスクを折りたたむ"}
              onClick={onToggleCollapse}
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
          <span className="truncate text-sm font-medium">{task.title}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {task.parent_task_id ? "└ " : ""}
          {task.task_code}
        </span>
        <div className="flex flex-wrap gap-1">
          <TaskStatusBadge status={task.status} />
          <TaskFlagBadges isOverdue={task.is_overdue} isBlocked={task.is_blocked} />
        </div>
        {canUpdate ? (
          <div className="grid gap-2 pt-1">
            <div className="grid gap-2">
              <Input
                type="date"
                value={startDate}
                aria-label={`${task.task_code}の開始日`}
                disabled={isPending}
                onChange={(event) => setStartDate(event.target.value)}
              />
              <Input
                type="date"
                value={dueDate}
                aria-label={`${task.task_code}の終了予定日`}
                disabled={isPending}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!isDirty || isPending}
              onClick={() => {
                onScheduleUpdate({ startDate, dueDate }).catch(() => undefined);
              }}
            >
              期間を保存
            </Button>
          </div>
        ) : null}
      </div>
      <div
        ref={timelineRef}
        className="relative px-3 py-5"
        onPointerMove={updateDraggedRange}
        onPointerUp={finishDrag}
        onPointerCancel={() => setDragState(null)}
      >
        <WeekendBands range={range} />
        <div className="absolute inset-x-3 top-1/2 h-px bg-border" />
        <TodayLine range={range} />
        <div
          className="relative h-5 rounded-md bg-primary/20 data-[editable=true]:cursor-grab data-[dragging=true]:cursor-grabbing"
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
                className="absolute top-0 bottom-0 left-0 w-2 cursor-ew-resize rounded-l-md bg-primary/80"
                aria-label={`${task.task_code}の開始日をドラッグで変更`}
                onPointerDown={(event) => startDrag(event, "start")}
              />
              <button
                type="button"
                className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize rounded-r-md bg-primary/80"
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
}: {
  milestone: MilestoneRead;
  range: DateRange;
}) {
  const targetDate = new Date(milestone.target_date);
  const totalDays = Math.max(daysBetween(range.start, range.end), 1);
  const offset = Math.max(daysBetween(range.start, targetDate), 0);
  const left = `${Math.min((offset / totalDays) * 100, 100)}%`;

  return (
    <div
      className="absolute top-1/2 flex -translate-y-1/2 flex-col items-center gap-1"
      style={{ left }}
      title={`${milestone.title} ${formatDate(milestone.target_date)}`}
    >
      <span className="size-3 rotate-45 rounded-[2px] bg-primary" />
      <span className="max-w-28 truncate text-xs text-muted-foreground">
        {milestone.title}
      </span>
    </div>
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

type GanttDisplayUnit = "day" | "week" | "month" | "quarter";
type GanttDragMode = "move" | "start" | "end";

type GanttDragState = {
  mode: GanttDragMode;
  anchorDate: string;
  originalStartDate: string;
  originalDueDate: string;
};

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

const daysBetween = (start: Date, end: Date) => {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round((end.getTime() - start.getTime()) / millisecondsPerDay);
};

const getPointerDate = (
  event: React.PointerEvent<HTMLElement>,
  range: DateRange,
  timeline: HTMLDivElement | null
) => {
  if (!timeline) {
    return null;
  }

  const rect = timeline.getBoundingClientRect();
  const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  const totalDays = Math.max(daysBetween(range.start, range.end), 1);
  const date = new Date(range.start);

  date.setDate(range.start.getDate() + Math.round(totalDays * ratio));

  return date;
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
  return date.toISOString().slice(0, 10);
};

const getTimelineBarStyle = (start: Date, end: Date, range: DateRange) => {
  const totalDays = Math.max(daysBetween(range.start, range.end), 1);
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
  const totalDays = Math.max(daysBetween(range.start, range.end) + 1, 1);
  const bands: Array<{ key: string; left: string; width: string }> = [];
  const date = new Date(range.start);

  while (date <= range.end) {
    const day = date.getDay();

    if (day === 0 || day === 6) {
      const offset = Math.max(daysBetween(range.start, date), 0);
      const key = date.toISOString().slice(0, 10);

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

const getTodayLeft = (range: DateRange) => {
  const today = new Date();

  if (today < range.start || today > range.end) {
    return null;
  }

  const totalDays = Math.max(daysBetween(range.start, range.end), 1);
  const offset = Math.max(daysBetween(range.start, today), 0);

  return `${Math.min((offset / totalDays) * 100, 100)}%`;
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

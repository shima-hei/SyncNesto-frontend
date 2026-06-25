"use client";

import { useRef } from "react";

import type { MilestoneRead, TaskRead } from "@/lib/api/generated/model";
import { cn } from "@/lib/utils";

import {
  type DateRange,
  type GanttDisplayUnit,
  type GanttGridStyle,
  getClientDate,
  getDateCells,
  toDateInputValue,
} from "../../lib/gantt-timeline";
import {
  getDraggedUnscheduledTaskId,
  hasDraggedUnscheduledTask,
} from "../../lib/task-gantt-dnd";
import {
  DropDateHighlight,
  GanttMilestoneHeaderMarkers,
  GanttMilestoneLines,
  TodayLine,
  WeekendBands,
} from "./gantt-timeline-overlays";

export function GanttUnscheduledDropLane({
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
        className={cn("py-3", isDragging && "bg-primary/5")}
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

export function GanttDroppableTimeline({
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

export function GanttTimelineHeader({
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

"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TaskRead } from "@/lib/api/generated/model";

import { getTaskStatusLabel } from "../../constants/task-options";
import type { TaskPlanningController } from "../../hooks/use-task-planning";
import {
  getTaskPlanningValues,
  type TaskPlanningValues,
} from "../../lib/task-planning";

import { TaskStatusBadge } from "../shared/task-badges";
import {
  TaskPlanningDateFields,
  TaskProgressFields,
} from "./task-planning-editor";

export const GANTT_COLUMNS =
  "grid-cols-[minmax(0,2fr)_3.25rem_minmax(0,1fr)_minmax(0,1fr)]";

type Changes = Partial<TaskPlanningValues>;

export function GanttPlanningCells({
  task,
  planning,
  editable,
  children,
}: {
  task: TaskRead;
  planning: TaskPlanningController;
  editable: boolean;
  children: ReactNode;
}) {
  const row = planning.rows[task.id];
  const values = row?.values ?? getTaskPlanningValues(task);
  const progress = values.progressPercent || "—";
  const dateLabel = (date: string) =>
    date ? date.slice(5).replace("-", "/") : "—";
  const period =
    values.startDate || values.dueDate
      ? `${dateLabel(values.startDate)} – ${dateLabel(values.dueDate)}`
      : "未日程";
  const commit = (baseline: TaskRead, changes: Changes) =>
    void planning.commit(baseline, changes);
  const common = { task, values, editable, commit };
  return (
    <>
      {children}
      <PlanningCell
        {...common}
        label="進捗"
        value={`${getTaskStatusLabel(values.status)} ${progress}%`}
        display={
          <GanttStatusProgress status={values.status} progress={progress} />
        }
      >
        {(current, change) => (
          <TaskProgressFields
            values={current}
            originalStatus={row?.baseline.status ?? task.status ?? "backlog"}
            onChange={change}
          />
        )}
      </PlanningCell>
      <PlanningCell {...common} label="予定期間" value={period}>
        {(current, change) => (
          <TaskPlanningDateFields values={current} onChange={change} />
        )}
      </PlanningCell>
    </>
  );
}

export function GanttStatusProgress({
  status,
  progress,
}: {
  status?: string | null;
  progress?: string | number | null;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <TaskStatusBadge status={status} />
      <span className="shrink-0 text-xs tabular-nums">{progress ?? 0}%</span>
    </span>
  );
}

function PlanningCell({
  task,
  label,
  value,
  values,
  editable,
  children,
  display,
  commit,
}: {
  task: TaskRead;
  label: string;
  value: string;
  values: TaskPlanningValues;
  editable: boolean;
  display?: ReactNode;
  commit: (baseline: TaskRead, changes: Changes) => void;
  children: (
    values: TaskPlanningValues,
    onChange: (changes: Changes) => void,
  ) => ReactNode;
}) {
  const [baseline, setBaseline] = useState<{
    task: TaskRead;
    values: TaskPlanningValues;
  } | null>(null);
  const [changes, setChanges] = useState<Changes>({});
  const ariaLabel = `${task.task_code}の${label} ${value}`;
  const apply = (next: Changes) => {
    if (!baseline) return;
    setBaseline(null);
    setChanges({});
    commit(baseline.task, next);
  };
  const trigger = (
    <PopoverTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-full min-w-0 justify-start rounded-sm px-1.5 text-xs tabular-nums"
        aria-label={ariaLabel}
        title={value}
      >
        {display ?? <span className="truncate">{value}</span>}
      </Button>
    </PopoverTrigger>
  );
  return editable ? (
    <Popover
      open={Boolean(baseline)}
      onOpenChange={(next) => {
        setBaseline(next ? { task, values } : null);
        if (!next) setChanges({});
      }}
    >
      {trigger}
      <PopoverContent
        className="w-64 space-y-2"
        align="start"
        aria-label={`${task.task_code}の${label}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (Object.keys(changes).length) apply(changes);
          }}
          className="space-y-2"
        >
          {children({ ...(baseline?.values ?? values), ...changes }, (next) => {
            setChanges((previous) => ({ ...previous, ...next }));
          })}

          <Button
            type="submit"
            size="sm"
            disabled={!Object.keys(changes).length}
          >
            適用
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  ) : (
    <span
      className="min-w-0 truncate px-1.5 text-xs tabular-nums"
      title={ariaLabel}
    >
      {display ?? value}
    </span>
  );
}

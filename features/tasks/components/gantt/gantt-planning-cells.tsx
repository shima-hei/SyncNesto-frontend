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
import { TaskUserSelectField } from "../forms/task-user-select-field";
import {
  TaskPlanningDateFields,
  TaskProgressFields,
} from "./task-planning-editor";

export const GANTT_COLUMNS =
  "grid-cols-[minmax(0,1.6fr)_minmax(0,.8fr)_minmax(0,1fr)_minmax(0,1fr)]";

type Changes = Partial<TaskPlanningValues>;

export function GanttPlanningCells({
  task,
  planning,
  editable,
  assigneeLabel,
}: {
  task: TaskRead;
  planning: TaskPlanningController;
  editable: boolean;
  assigneeLabel: string;
}) {
  const row = planning.rows[task.id];
  const values = row?.values ?? getTaskPlanningValues(task);
  const progress = `${getTaskStatusLabel(values.status)} ${values.progressPercent || "—"}%`;
  const dateLabel = (date: string) =>
    date ? date.slice(5).replace("-", "/") : "—";
  const period = `${dateLabel(values.startDate)} – ${dateLabel(values.dueDate)}`;
  const commit = (changes: Changes) => void planning.commit(task, changes);
  const common = { task, values, editable, commit };
  return (
    <>
      <PlanningCell {...common} label="担当者" value={assigneeLabel} immediate>
        {(current, change) => (
          <TaskUserSelectField
            projectId={task.project_id}
            label="担当者"
            value={current.assigneeId}
            onChange={(assigneeId) => change({ assigneeId })}
          />
        )}
      </PlanningCell>
      <PlanningCell {...common} label="進捗" value={progress}>
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

function PlanningCell({
  task,
  label,
  value,
  values,
  editable,
  children,
  immediate = false,
  commit,
}: {
  task: TaskRead;
  label: string;
  value: string;
  values: TaskPlanningValues;
  editable: boolean;
  immediate?: boolean;
  commit: (changes: Changes) => void;
  children: (
    values: TaskPlanningValues,
    onChange: (changes: Changes) => void,
  ) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [changes, setChanges] = useState<Changes>({});
  const ariaLabel = `${task.task_code}の${label} ${value}`;
  const apply = (next: Changes) => {
    setOpen(false);
    setChanges({});
    commit(next);
  };
  return editable ? (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setChanges({});
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-full min-w-0 justify-start rounded-sm px-1.5 text-xs tabular-nums"
          aria-label={ariaLabel}
          title={value}
        >
          <span className="truncate">{value}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 space-y-2"
        align="start"
        aria-label={`${task.task_code}の${label}`}
      >
        {children({ ...values, ...changes }, (next) => {
          if (immediate) apply(next);
          else setChanges((previous) => ({ ...previous, ...next }));
        })}
        {immediate ? null : (
          <Button
            type="button"
            size="sm"
            disabled={!Object.keys(changes).length}
            onClick={() => apply(changes)}
          >
            適用
          </Button>
        )}
      </PopoverContent>
    </Popover>
  ) : (
    <span
      className="min-w-0 truncate px-1.5 text-xs tabular-nums"
      title={ariaLabel}
    >
      {value}
    </span>
  );
}

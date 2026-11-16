"use client";

import type { PropsWithChildren } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TaskRead } from "@/lib/api/generated/model";

import { getTaskStatusLabel } from "../../constants/task-options";
import type { TaskPlanningController } from "../../hooks/use-task-planning";
import { getTaskPlanningValues } from "../../lib/task-planning";
import { TaskUserSelectField } from "../forms/task-user-select-field";
import {
  TaskPlanningDateFields,
  TaskProgressFields,
} from "./task-planning-editor";

export const GANTT_COLUMNS =
  "grid-cols-[minmax(0,1.6fr)_minmax(0,.8fr)_minmax(0,1fr)_minmax(0,1fr)]";

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
  return (
    <>
      <PlanningCell
        editable={editable}
        task={task}
        label="担当者"
        value={assigneeLabel}
      >
        <TaskUserSelectField
          projectId={task.project_id}
          label="担当者"
          value={values.assigneeId}
          onChange={(assigneeId) => planning.edit(task, { assigneeId })}
        />
      </PlanningCell>
      <PlanningCell
        editable={editable}
        task={task}
        label="進捗"
        value={progress}
      >
        <TaskProgressFields
          values={values}
          originalStatus={row?.baseline.status ?? task.status ?? "backlog"}
          onChange={(changes) => planning.edit(task, changes)}
        />
      </PlanningCell>
      <PlanningCell
        editable={editable}
        task={task}
        label="予定期間"
        value={period}
      >
        <TaskPlanningDateFields
          values={values}
          onChange={(changes) => planning.edit(task, changes)}
        />
      </PlanningCell>
    </>
  );
}

function PlanningCell({
  task,
  label,
  value,
  editable,
  children,
}: PropsWithChildren<{
  task: TaskRead;
  label: string;
  value: string;
  editable: boolean;
}>) {
  const ariaLabel = `${task.task_code}の${label} ${value}`;
  return editable ? (
    <Popover>
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
        {children}
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

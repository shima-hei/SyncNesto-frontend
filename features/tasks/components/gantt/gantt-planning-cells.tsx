"use client";

import { useState, type ReactNode } from "react";
import { UserRoundIcon } from "lucide-react";

import { UserAvatar } from "@/components/shared/display/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TaskRead } from "@/lib/api/generated/model";

import { getTaskStatusLabel } from "../../constants/task-options";
import type { TaskPlanningController } from "../../hooks/use-task-planning";
import {
  getTaskPlanningValues,
  type TaskPlanningValues,
} from "../../lib/task-planning";
import { TaskUserSelectField } from "../forms/task-user-select-field";
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
  const commit = (changes: Changes) => void planning.commit(task, changes);
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

export function GanttAssigneeCell({
  task,
  planning,
  editable,
  name,
  avatarUrl,
}: {
  task: TaskRead;
  planning: TaskPlanningController;
  editable: boolean;
  name: string;
  avatarUrl?: string | null;
}) {
  const values = planning.rows[task.id]?.values ?? getTaskPlanningValues(task);
  return (
    <PlanningCell
      task={task}
      values={values}
      editable={editable}
      commit={(changes) => void planning.commit(task, changes)}
      label="担当者"
      value={name}
      immediate
      icon={
        values.assigneeId ? (
          <UserAvatar name={name} src={avatarUrl} size="sm" />
        ) : (
          <UserRoundIcon className="size-4 text-muted-foreground" />
        )
      }
    >
      {(current, change) => (
        <TaskUserSelectField
          projectId={task.project_id}
          label="担当者"
          value={current.assigneeId}
          onChange={(assigneeId) => change({ assigneeId })}
        />
      )}
    </PlanningCell>
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
  icon,
  display,
  commit,
}: {
  task: TaskRead;
  label: string;
  value: string;
  values: TaskPlanningValues;
  editable: boolean;
  immediate?: boolean;
  icon?: ReactNode;
  display?: ReactNode;
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
  const trigger = (
    <PopoverTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={
          icon
            ? "size-8 rounded-sm p-0"
            : "h-8 w-full min-w-0 justify-start rounded-sm px-1.5 text-xs tabular-nums"
        }
        aria-label={ariaLabel}
        title={icon ? undefined : value}
      >
        {icon ? (
          <span aria-hidden>{icon}</span>
        ) : (
          (display ?? <span className="truncate">{value}</span>)
        )}
      </Button>
    </PopoverTrigger>
  );
  return editable ? (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setChanges({});
      }}
    >
      {icon ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent>{value}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
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
  ) : icon ? (
    <span
      className="inline-flex size-8 items-center justify-center"
      title={value}
    >
      <span aria-hidden>{icon}</span>
      <span className="sr-only">{ariaLabel}</span>
    </span>
  ) : (
    <span
      className="min-w-0 truncate px-1.5 text-xs tabular-nums"
      title={ariaLabel}
    >
      {display ?? value}
    </span>
  );
}

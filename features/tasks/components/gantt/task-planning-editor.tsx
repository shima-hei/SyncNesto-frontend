"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { TaskRead } from "@/lib/api/generated/model";

import type { TaskPlanningController } from "../../hooks/use-task-planning";
import { effortBasisLabel } from "../../lib/task-effort";
import { getTaskPlanningValues } from "../../lib/task-planning";
import { TaskUserSelectField } from "../forms/task-user-select-field";

export function TaskPlanningFields({
  task,
  planning,
  inline = false,
}: {
  task: TaskRead;
  planning: TaskPlanningController;
  inline?: boolean;
}) {
  const row = planning.rows[task.id];
  const values = row?.values ?? getTaskPlanningValues(task);
  const disabled =
    planning.checkingId === task.id ||
    Boolean(planning.pendingDraft) ||
    row?.status === "pending" ||
    row?.status === "unknown";
  return (
    <FieldGroup
      className={
        inline
          ? "grid grid-cols-[minmax(190px,1fr)_140px_140px_118px] items-start gap-2"
          : "gap-4"
      }
      onKeyDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <TaskUserSelectField
        projectId={task.project_id}
        label="担当者"
        value={values.assigneeId}
        disabled={disabled}
        onChange={(assigneeId) => planning.edit(task, { assigneeId })}
      />
      {(
        [
          ["startDate", "開始予定日"],
          ["dueDate", "終了予定日"],
        ] as const
      ).map(([key, label]) => (
        <Field key={key}>
          <FieldLabel
            htmlFor={`planning-${inline ? "grid" : "sheet"}-${task.id}-${key}`}
          >
            {label}
          </FieldLabel>
          <Input
            id={`planning-${inline ? "grid" : "sheet"}-${task.id}-${key}`}
            type="date"
            value={values[key]}
            disabled={disabled}
            onChange={(event) =>
              planning.edit(task, { [key]: event.target.value })
            }
          />
        </Field>
      ))}
      <Field>
        <FieldLabel
          htmlFor={`planning-${inline ? "grid" : "sheet"}-${task.id}-estimate`}
        >
          見積入力（分）
        </FieldLabel>
        <Input
          id={`planning-${inline ? "grid" : "sheet"}-${task.id}-estimate`}
          inputMode="numeric"
          value={values.estimatedMinutes}
          disabled={disabled}
          placeholder="未設定"
          onChange={(event) =>
            planning.edit(task, { estimatedMinutes: event.target.value })
          }
        />
        <FieldDescription>
          {effortBasisLabel(task.estimated_basis)}
        </FieldDescription>
      </Field>
    </FieldGroup>
  );
}

export function TaskPlanningActions({
  task,
  planning,
}: {
  task: TaskRead;
  planning: TaskPlanningController;
}) {
  const row = planning.rows[task.id];
  if (!row) return null;
  const pending = row.status === "pending";
  const mustCheck = row.status === "conflict" || row.status === "unknown";
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        {mustCheck ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={planning.checkingId === task.id}
            onClick={() => void planning.confirm(task.id)}
          >
            {planning.checkingId === task.id
              ? "現在値を確認中…"
              : "現在値と比較"}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={pending || Boolean(planning.pendingDraft)}
            onClick={() => void planning.save(task)}
          >
            {pending ? "保存中…" : "この行を保存"}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => planning.discard(task.id)}
        >
          編集を破棄
        </Button>
        <span className="text-xs text-muted-foreground">
          {mustCheck ? "入力を保持しています" : "未保存"}
        </span>
      </div>
      {row.message ? (
        <p role="status" className="text-sm text-destructive">
          {row.message}
        </p>
      ) : null}
    </div>
  );
}

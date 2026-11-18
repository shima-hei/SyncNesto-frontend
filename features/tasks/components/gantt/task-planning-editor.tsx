"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { TaskRead } from "@/lib/api/generated/model";

import { TASK_STATUS_OPTIONS } from "../../constants/task-options";
import type { TaskPlanningController } from "../../hooks/use-task-planning";
import { effortBasisLabel } from "../../lib/task-effort";
import {
  getTaskPlanningValues,
  type TaskPlanningValues,
} from "../../lib/task-planning";
import { TaskUserSelectField } from "../forms/task-user-select-field";

const dateFields = [
  ["startDate", "開始予定日"],
  ["dueDate", "終了予定日"],
] as const;

export function TaskPlanningDateFields({
  values,
  disabled,
  onChange,
}: {
  values: TaskPlanningValues;
  disabled?: boolean;
  onChange: (changes: Partial<TaskPlanningValues>) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-3">
      {dateFields.map(([key, label]) => (
        <Field key={key}>
          <FieldLabel htmlFor={`${id}-${key}`}>{label}</FieldLabel>
          <Input
            id={`${id}-${key}`}
            type="date"
            value={values[key]}
            disabled={disabled}
            onChange={(event) => onChange({ [key]: event.target.value })}
          />
        </Field>
      ))}
    </div>
  );
}

export function TaskProgressFields({
  values,
  originalStatus,
  disabled,
  onChange,
}: {
  values: TaskPlanningValues;
  originalStatus: string;
  disabled?: boolean;
  onChange: (changes: Partial<TaskPlanningValues>) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-3">
      <Field>
        <FieldLabel htmlFor={`${id}-status`}>状態</FieldLabel>
        <select
          id={`${id}-status`}
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          disabled={disabled}
          value={values.status}
          onChange={(event) => {
            const status = event.target.value;
            onChange({
              status,
              ...(status === "done" ? { progressPercent: "100" } : {}),
            });
          }}
        >
          {!TASK_STATUS_OPTIONS.some(({ value }) => value === values.status) ? (
            <option value={values.status}>{values.status}</option>
          ) : null}
          {TASK_STATUS_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-progress`}>進捗率（%）</FieldLabel>
        <Input
          id={`${id}-progress`}
          inputMode="numeric"
          maxLength={3}
          value={values.progressPercent}
          disabled={disabled || values.status === "done"}
          onChange={(event) =>
            onChange({ progressPercent: event.target.value })
          }
        />
      </Field>
      {values.status === "returned" && originalStatus !== "returned" ? (
        <Field>
          <FieldLabel htmlFor={`${id}-reason`}>差し戻し理由（必須）</FieldLabel>
          <Input
            id={`${id}-reason`}
            value={values.changeReason}
            disabled={disabled}
            required
            onChange={(event) => onChange({ changeReason: event.target.value })}
          />
        </Field>
      ) : null}
    </div>
  );
}

export function TaskPlanningFields({
  task,
  planning,
}: {
  task: TaskRead;
  planning: TaskPlanningController;
}) {
  const row = planning.rows[task.id];
  const values = row?.values ?? getTaskPlanningValues(task);
  const disabled =
    planning.checkingId === task.id ||
    Boolean(planning.pendingDraft) ||
    row?.status === "pending" ||
    row?.status === "unknown" ||
    row?.status === "conflict";
  return (
    <FieldGroup className="gap-4">
      <TaskUserSelectField
        projectId={task.project_id}
        label="担当者"
        value={values.assigneeId}
        disabled={disabled}
        onChange={(assigneeId) => planning.edit(task, { assigneeId })}
      />
      <TaskProgressFields
        values={values}
        originalStatus={row?.baseline.status ?? task.status ?? "backlog"}
        disabled={disabled}
        onChange={(changes) => planning.edit(task, changes)}
      />
      <TaskPlanningDateFields
        values={values}
        disabled={disabled}
        onChange={(changes) => planning.edit(task, changes)}
      />
      <Field>
        <FieldLabel htmlFor={`planning-sheet-${task.id}-estimate`}>
          見積入力（分）
        </FieldLabel>
        <Input
          id={`planning-sheet-${task.id}-estimate`}
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

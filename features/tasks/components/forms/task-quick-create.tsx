"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { DraftRestoreDialog } from "@/components/shared/dialogs/draft-restore-dialog";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useFormDraft } from "@/hooks/use-form-draft";
import { getTaskFormDraftScope } from "../../lib/task-form-draft";

import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TaskRead } from "@/lib/api/generated/model";

import type { TaskFormValues } from "../../types/task-form";
import { defaultTaskFormValues } from "../../lib/task-mappers";
import { getTaskEstimateHref } from "../../lib/planning-route";
import {
  TASK_PRIORITY_OPTIONS,
  TASK_RELATION_TYPE_OPTIONS,
} from "../../constants/task-options";
import { DateField, TaskSelectField } from "./task-form-fields";
import { TaskUserSelectField } from "./task-user-select-field";
import { useListNavigation } from "@/hooks/use-list-navigation";

export function TaskQuickCreate({
  projectId,
  initialValues = defaultTaskFormValues,
  submitTask,
  isPending,
  error,
  focusOnOpen = false,
  titleId,
  label = "新しいタスク",
  gantt = false,
  visibleIds,
  onCreated,
  actions,
}: {
  projectId: number;
  initialValues?: TaskFormValues;
  submitTask: (values: TaskFormValues) => Promise<TaskRead>;
  isPending: boolean;
  error?: Error | null;
  focusOnOpen?: boolean;
  titleId?: string;
  label?: string;
  gantt?: boolean;
  visibleIds?: number[];
  onCreated?: (task: TaskRead) => void;
  actions?: (task: TaskRead) => ReactNode;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const defaults = {
    title: "",
    description: "",
    assigneeId: initialValues.assigneeId,
    dueDate: initialValues.dueDate,
    priority: initialValues.priority,
    relationType: initialValues.relationType,
  };
  const [values, setValues] = useState(defaults);
  const { user } = useAuth();
  const draft = useFormDraft({
    userId: user?.id,
    scope:
      getTaskFormDraftScope(projectId, "create", initialValues) +
      (gantt ? ":gantt:" + initialValues.phaseAssignment : ":quick"),
    initialValues: defaults,
    values,
    onRestore: setValues,
  });
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [created, setCreated] = useState<TaskRead | null>(null);
  const { withReturn } = useListNavigation(
    "/projects/joined/" + projectId + "/tasks",
  );
  useEffect(() => {
    if (focusOnOpen) input.current?.focus({ preventScroll: true });
  }, [focusOnOpen]);
  const change = (field: keyof typeof defaults, value: string) =>
    setValues((previous) => ({ ...previous, [field]: value }));
  const submit = async () => {
    if (inFlight.current || !values.title.trim()) return;
    inFlight.current = true;
    try {
      const task = await submitTask({ ...initialValues, ...values });
      draft.clearDraft();
      setValues(defaults);
      setCreated(task);
      onCreated?.(task);
      input.current?.focus({ preventScroll: true });
    } catch {
      // 失敗時は入力を保持する。
    } finally {
      inFlight.current = false;
    }
  };
  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <DraftRestoreDialog
        open={Boolean(draft.pendingDraft) && (!gantt || focusOnOpen)}
        updatedAt={draft.pendingDraft?.updatedAt}
        onDiscard={draft.discardDraft}
        onRestore={draft.restoreDraft}
      />
      <form
        aria-labelledby={id + "-label"}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="space-y-2"
      >
        <div className="flex flex-wrap items-end gap-2">
          <Field className="min-w-0 flex-1 basis-48 gap-1">
            <FieldLabel id={id + "-label"} htmlFor={titleId ?? id}>
              {label}
            </FieldLabel>
            <Input
              id={titleId ?? id}
              name="title"
              maxLength={255}
              ref={input}
              value={values.title}
              placeholder="タスク名を入力"
              required
              autoComplete="off"
              enterKeyHint="done"
              readOnly={isPending}
              onChange={(e) => change("title", e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229)
                )
                  e.preventDefault();
              }}
            />
          </Field>
          <Button type="submit" disabled={isPending || !values.title.trim()}>
            {isPending ? "登録中…" : "登録"}
          </Button>
        </div>
        <details onToggle={(e) => setOptionsOpen(e.currentTarget.open)}>
          <summary className="w-fit cursor-pointer text-sm text-muted-foreground">
            {gantt ? "メモを追加（任意）" : "担当・終了予定日・その他の項目"}
          </summary>
          {optionsOpen && (
            <fieldset
              disabled={isPending}
              className="mt-3 grid min-w-0 gap-3 sm:grid-cols-3"
            >
              <legend className="sr-only">任意の項目</legend>
              {!gantt && (
                <>
                  <TaskUserSelectField
                    projectId={projectId}
                    label="担当者"
                    value={values.assigneeId}
                    onChange={(v) => change("assigneeId", v)}
                  />
                  <DateField
                    label="終了予定日"
                    value={values.dueDate}
                    onChange={(v) => change("dueDate", v)}
                  />
                  <TaskSelectField
                    label="優先度"
                    options={TASK_PRIORITY_OPTIONS}
                    value={values.priority}
                    onChange={(v) => change("priority", v)}
                  />
                  {initialValues.requirementId && (
                    <TaskSelectField
                      label="関連種別"
                      options={TASK_RELATION_TYPE_OPTIONS}
                      value={values.relationType}
                      onChange={(v) => change("relationType", v)}
                    />
                  )}
                </>
              )}
              <Field className="sm:col-span-3">
                <FieldLabel htmlFor={id + "-memo"}>メモ</FieldLabel>
                <Textarea
                  id={id + "-memo"}
                  name="description"
                  rows={2}
                  value={values.description}
                  onChange={(e) => change("description", e.target.value)}
                />
              </Field>
            </fieldset>
          )}
        </details>
        <FormApiError error={error} />
      </form>
      <div
        role="status"
        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm empty:sr-only"
      >
        {created && (
          <>
            <span>
              {created.task_code}「{created.title}」を登録しました。
              {visibleIds &&
                !visibleIds.includes(created.id) &&
                "現在の表示条件・ページには表示されません。"}
            </span>
            <Link
              className="underline"
              href={withReturn(
                "/projects/joined/" + projectId + "/tasks/" + created.id,
              )}
            >
              詳細を開く
            </Link>
            <Link
              className="underline"
              href={getTaskEstimateHref(projectId, created.id)}
            >
              見積を入力
            </Link>
            {actions?.(created)}
          </>
        )}
      </div>
    </div>
  );
}

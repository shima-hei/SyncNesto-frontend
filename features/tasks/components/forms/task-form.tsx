"use client";

import { useId, useRef, useState } from "react";

import { ConflictResolutionDialog } from "@/components/shared/dialogs/conflict-resolution-dialog";
import { DraftRestoreDialog } from "@/components/shared/dialogs/draft-restore-dialog";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { FormSubmitButton } from "@/components/shared/forms/form-submit-button";
import { MarkdownTextarea } from "@/components/shared/forms/markdown-textarea";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getConflictFields } from "@/lib/api/conflict";

import { TASK_CONFLICT_FIELD_LABELS } from "../../constants/task-conflict-fields";
import {
  TASK_PRIORITY_OPTIONS,
  TASK_RELATION_TYPE_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_TYPE_OPTIONS,
  getTaskPriorityLabel,
  getTaskStatusLabel,
  getTaskTypeLabel,
} from "../../constants/task-options";
import { useTaskFormDraft } from "../../hooks/use-task-form-draft";
import { mergeTaskFormDraft } from "../../lib/task-form-draft";
import { taskSchema } from "../../schemas/task-schema";
import type { TaskFormErrors, TaskFormValues } from "../../types/task-form";
import { TaskParentSelectField } from "./task-parent-select-field";
import { TaskRequirementSelectField } from "./task-requirement-select-field";
import { TaskTagInput } from "./task-tag-input";
import { TaskUserSelectField } from "./task-user-select-field";
import { DateField, NumberField, TaskSelectField } from "./task-form-fields";

type TaskFormProps = {
  mode: "create" | "update";
  projectId: number;
  fullWidth?: boolean;
  currentTaskId?: number;
  initialValues: TaskFormValues;
  isPending: boolean;
  error?: Error | null;
  conflictValues?: TaskFormValues | null;
  onCloseConflict?: () => void;
  onResolveConflict?: (values: TaskFormValues) => Promise<unknown>;
  onSubmit: (values: TaskFormValues) => Promise<unknown>;
  onSuccess?: () => void;
};

export function TaskForm({
  mode,
  projectId,
  fullWidth = false,
  currentTaskId,
  initialValues,
  isPending,
  error,
  conflictValues,
  onCloseConflict,
  onResolveConflict,
  onSubmit,
  onSuccess,
}: TaskFormProps) {
  const taskCodeId = useId();
  const titleId = useId();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const draft = useTaskFormDraft({
    projectId,
    mode,
    currentTaskId,
    initialValues,
    values,
    onRestore: setValues,
  });

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();

    const result = taskSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        taskCode: fieldErrors.taskCode?.[0],
        title: fieldErrors.title?.[0],
        taskType: fieldErrors.taskType?.[0],
        status: fieldErrors.status?.[0],
        priority: fieldErrors.priority?.[0],
        assigneeId: fieldErrors.assigneeId?.[0],
        reporterId: fieldErrors.reporterId?.[0],
        progressPercent: fieldErrors.progressPercent?.[0],
        estimatedMinutes: fieldErrors.estimatedMinutes?.[0],
        actualMinutes: fieldErrors.actualMinutes?.[0],
        parentTaskId: fieldErrors.parentTaskId?.[0],
        requirementId: fieldErrors.requirementId?.[0],
        tags: fieldErrors.tags?.[0],
        sortOrder: fieldErrors.sortOrder?.[0],
      });
      if (
        Object.keys(fieldErrors).some((field) => field !== "title") &&
        detailsRef.current
      ) {
        detailsRef.current.open = true;
      }
      return;
    }

    setErrors({});
    await onSubmit(result.data)
      .then(() => {
        draft.clearDraft();
        onSuccess?.();
      })
      .catch(() => undefined);
  };

  const updateValue = <TKey extends keyof TaskFormValues>(
    field: TKey,
    value: TaskFormValues[TKey],
  ) => {
    const next = { ...values, [field]: value };
    setValues(next);
    draft.persist(next);
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const conflictFields = conflictValues
    ? getConflictFields({
        original: initialValues as Record<string, unknown>,
        local: values as Record<string, unknown>,
        current: conflictValues as Record<string, unknown>,
      })
    : [];

  return (
    <>
      <form
        className={fullWidth ? "w-full" : "mx-auto w-full max-w-4xl"}
        onSubmit={handleSubmit}
      >
        <FieldGroup>
          <Field data-invalid={errors.title ? true : undefined}>
            <FieldLabel htmlFor={titleId}>タスク名</FieldLabel>
            <Input
              id={titleId}
              value={values.title}
              placeholder="例：ログイン画面を確認する"
              onChange={(event) => updateValue("title", event.target.value)}
              aria-invalid={Boolean(errors.title)}
              aria-required
              autoFocus={mode === "create"}
            />
            <FieldDescription>
              {mode === "create"
                ? "タスク名だけで作成できます。ほかの項目は後から設定できます。"
                : "変更する項目だけ編集してください。"}
            </FieldDescription>
            {errors.title ? <FieldError>{errors.title}</FieldError> : null}
          </Field>
          <p className="text-sm text-muted-foreground">
            {getTaskStatusLabel(values.status)} ·{" "}
            {getTaskTypeLabel(values.taskType)} · 優先度
            {getTaskPriorityLabel(values.priority)}
            {values.parentTaskId ? " · 親タスク設定済み" : ""}
            {values.requirementId ? " · 関連要件設定済み" : ""}
          </p>
          <details ref={detailsRef} className="rounded-lg border p-4">
            <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-ring">
              詳細設定
            </summary>
            <FieldGroup className="pt-4">
              <Field data-invalid={errors.taskCode ? true : undefined}>
                <FieldLabel htmlFor={taskCodeId}>
                  {mode === "create" ? "タスクID（任意）" : "タスクID"}
                </FieldLabel>
                <Input
                  id={taskCodeId}
                  value={values.taskCode}
                  placeholder="TASK-001"
                  readOnly={mode === "update"}
                  onChange={(event) => {
                    if (mode === "create") {
                      updateValue("taskCode", event.target.value);
                    }
                  }}
                  aria-invalid={Boolean(errors.taskCode)}
                />
                {mode === "create" ? (
                  <FieldDescription>
                    未入力の場合は自動採番されます。
                  </FieldDescription>
                ) : null}
                {errors.taskCode ? (
                  <FieldError>{errors.taskCode}</FieldError>
                ) : null}
              </Field>

              <Field>
                <FieldLabel>説明</FieldLabel>
                <MarkdownTextarea
                  value={values.description}
                  placeholder="Markdown形式で説明を入力"
                  onChange={(value) => updateValue("description", value)}
                />
              </Field>

              <TaskTagInput
                projectId={projectId}
                value={values.tags}
                error={errors.tags}
                onChange={(value) => updateValue("tags", value)}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <TaskSelectField
                  label="種別"
                  value={values.taskType}
                  options={TASK_TYPE_OPTIONS}
                  error={errors.taskType}
                  onChange={(value) => updateValue("taskType", value)}
                />
                <TaskSelectField
                  label="ステータス"
                  value={values.status}
                  options={TASK_STATUS_OPTIONS}
                  error={errors.status}
                  onChange={(value) => updateValue("status", value)}
                />
                <TaskSelectField
                  label="優先度"
                  value={values.priority}
                  options={TASK_PRIORITY_OPTIONS}
                  error={errors.priority}
                  onChange={(value) => updateValue("priority", value)}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <TaskUserSelectField
                  projectId={projectId}
                  label="担当者"
                  value={values.assigneeId}
                  error={errors.assigneeId}
                  onChange={(value) => updateValue("assigneeId", value)}
                />
                <TaskUserSelectField
                  projectId={projectId}
                  label="報告者"
                  value={values.reporterId}
                  error={errors.reporterId}
                  onChange={(value) => updateValue("reporterId", value)}
                />
                <TaskParentSelectField
                  projectId={projectId}
                  value={values.parentTaskId}
                  error={errors.parentTaskId}
                  excludedTaskId={currentTaskId}
                  onChange={(value) => updateValue("parentTaskId", value)}
                />
                {mode === "create" ? (
                  <TaskRequirementSelectField
                    projectId={projectId}
                    value={values.requirementId}
                    error={errors.requirementId}
                    onChange={(value) => updateValue("requirementId", value)}
                  />
                ) : (
                  <Field>
                    <FieldLabel>関連要件</FieldLabel>
                    <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                      関連要件は要件詳細の関連タスクから管理します。
                    </p>
                  </Field>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <DateField
                  label="開始日"
                  value={values.startDate}
                  onChange={(value) => updateValue("startDate", value)}
                />
                <DateField
                  label="終了予定日"
                  value={values.dueDate}
                  onChange={(value) => updateValue("dueDate", value)}
                />
                <DateField
                  label="実績開始日"
                  value={values.actualStartDate}
                  onChange={(value) => updateValue("actualStartDate", value)}
                />
                <DateField
                  label="実績終了日"
                  value={values.actualEndDate}
                  onChange={(value) => updateValue("actualEndDate", value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <NumberField
                  label="進捗率"
                  value={values.progressPercent}
                  error={errors.progressPercent}
                  suffix="%"
                  onChange={(value) => updateValue("progressPercent", value)}
                />
                <NumberField
                  label="見積時間"
                  value={values.estimatedMinutes}
                  error={errors.estimatedMinutes}
                  suffix="分"
                  onChange={(value) => updateValue("estimatedMinutes", value)}
                />
                <NumberField
                  label="実績時間"
                  value={values.actualMinutes}
                  error={errors.actualMinutes}
                  suffix="分"
                  onChange={(value) => updateValue("actualMinutes", value)}
                />
                <NumberField
                  label="並び順"
                  value={values.sortOrder}
                  error={errors.sortOrder}
                  onChange={(value) => updateValue("sortOrder", value)}
                />
              </div>

              {mode === "create" ? (
                <TaskSelectField
                  label="関連種別"
                  value={values.relationType}
                  options={TASK_RELATION_TYPE_OPTIONS}
                  onChange={(value) => updateValue("relationType", value)}
                />
              ) : (
                <Field>
                  <FieldLabel>更新理由</FieldLabel>
                  <Textarea
                    value={values.changeReason}
                    onChange={(event) =>
                      updateValue("changeReason", event.target.value)
                    }
                  />
                </Field>
              )}
            </FieldGroup>
          </details>

          <FormApiError error={error} />
          {draft.storageError ? (
            <p role="alert" className="text-sm text-destructive">
              下書きを保存できません。画面を閉じる前に入力内容を控えてください。
            </p>
          ) : null}
          <FormSubmitButton isPending={isPending}>
            {mode === "create" ? "タスクを作成" : "更新"}
          </FormSubmitButton>
        </FieldGroup>
      </form>

      <DraftRestoreDialog
        open={Boolean(draft.pendingDraft)}
        updatedAt={draft.pendingDraft?.updatedAt}
        onRestore={draft.restoreDraft}
        onDiscard={draft.discardDraft}
      />
      {draft.restoreConflict && draft.restoredValues ? (
        <ConflictResolutionDialog
          open
          title="下書きと保存済みの内容を確認"
          description="下書きの保存後に変更された項目があります。入力へ戻す内容を選んでください。この操作ではタスクを更新しません。"
          submitLabel="入力へ復元"
          fields={getConflictFields({
            original: draft.restoreConflict.initialValues,
            local: draft.restoreConflict.values,
            current: initialValues,
          })}
          localValues={draft.restoredValues}
          currentValues={initialValues}
          fieldLabels={TASK_CONFLICT_FIELD_LABELS}
          onOpenChange={(open) => !open && draft.closeRestoreConflict()}
          onResolve={draft.resolveRestore}
        />
      ) : null}

      {conflictValues && onCloseConflict && onResolveConflict ? (
        <ConflictResolutionDialog
          open
          fields={conflictFields}
          localValues={mergeTaskFormDraft(
            { values, initialValues },
            conflictValues,
          )}
          currentValues={conflictValues}
          fieldLabels={TASK_CONFLICT_FIELD_LABELS}
          isPending={isPending}
          onOpenChange={(open) => !open && onCloseConflict()}
          onResolve={async (resolvedValues) => {
            setValues(resolvedValues);
            draft.persist(resolvedValues);
            await onResolveConflict(resolvedValues);
          }}
        />
      ) : null}
    </>
  );
}

"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";

import { ConflictResolutionDialog } from "@/components/shared/dialogs/conflict-resolution-dialog";
import { DraftRestoreDialog } from "@/components/shared/dialogs/draft-restore-dialog";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { TaskFormActions } from "./task-form-actions";
import { MarkdownTextarea } from "@/components/shared/forms/markdown-textarea";
import {
  Field,
  FieldDescription,
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
} from "../../constants/task-options";
import { useTaskFormDraft } from "../../hooks/use-task-form-draft";
import { mergeTaskFormDraft } from "../../lib/task-form-draft";
import { taskSchema } from "../../schemas/task-schema";
import type { TaskFormErrors, TaskFormValues } from "../../types/task-form";
import { TaskParentSelectField } from "./task-parent-select-field";
import { TaskRequirementSelectField } from "./task-requirement-select-field";
import { TaskTagInput } from "./task-tag-input";
import { TaskUserSelectField } from "./task-user-select-field";
import { TaskTypeField } from "./task-type-field";
import {
  DateField,
  NumberField,
  TaskFieldError,
  TaskSelectField,
} from "./task-form-fields";
import {
  TaskPhaseSelectField,
  EFFORT_BASIS_OPTIONS,
} from "./task-phase-select-field";

import type { TaskEditSection } from "../../lib/task-mappers";

type TaskFormSubmit = (
  values: TaskFormValues,
  onSaved?: () => void,
) => Promise<unknown>;

type TaskFormProps = {
  mode: "create" | "update";
  projectId: number;
  fullWidth?: boolean;
  detailedCreate?: boolean;
  draftScope?: string;
  startupValues?: TaskFormValues;
  fixedRequirementLabel?: string;
  section?: TaskEditSection;
  onCancel?: () => void;
  currentTaskId?: number;
  initialValues: TaskFormValues;
  isPending: boolean;
  error?: Error | null;
  conflictValues?: TaskFormValues | null;
  onCloseConflict?: () => void;
  onResolveConflict?: TaskFormSubmit;
  onSubmit: TaskFormSubmit;
  onSuccess?: () => void;
};

export function TaskForm({
  mode,
  projectId,
  fullWidth = false,
  detailedCreate = false,
  draftScope,
  startupValues,
  fixedRequirementLabel,
  section,
  onCancel,
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
  const descriptionId = useId();
  const reasonId = useId();
  const [values, setValues] = useState(startupValues ?? initialValues);
  const dirty = Object.keys(initialValues).some(
    (key) =>
      values[key as keyof TaskFormValues] !==
      initialValues[key as keyof TaskFormValues],
  );
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const saving = useRef(false);
  const submittedForm = useRef<HTMLFormElement | null>(null);
  const errorStatus = useRef<HTMLDivElement>(null);

  const formRef = useRef<HTMLFormElement>(null);
  useLayoutEffect(() => {
    if (section)
      formRef.current
        ?.querySelector<HTMLElement>(
          'input:not([readonly]), textarea, [role="combobox"],button[aria-expanded]',
        )
        ?.focus({ preventScroll: true });
  }, [section]);
  useLayoutEffect(() => {
    const form = submittedForm.current;
    if (!form) return;
    submittedForm.current = null;
    const invalid = form.querySelectorAll<HTMLElement>(
      '[aria-invalid="true"]:not(:disabled):not([readonly])',
    );
    invalid.forEach((control) => {
      const details = control.closest("details");
      if (details) details.open = true;
    });
    const first = invalid[0];
    if (!first) return;
    if (first === document.activeElement) {
      const message = form.ownerDocument.getElementById(`${first.id}-error`);
      if (message?.textContent && errorStatus.current) {
        // Enter で同じ欄から送信したときも、入力エラーを知らせる。
        errorStatus.current.textContent = message.textContent;
      }
    } else {
      first.focus({ preventScroll: true });
    }
    first.scrollIntoView({ block: "center" });
  }, [errors]);
  const draft = useTaskFormDraft({
    projectId,
    mode,
    currentTaskId,
    section,
    initialValues,
    values,
    onRestore: setValues,
    draftScope,
  });
  const save = async (next: TaskFormValues, submit: TaskFormSubmit) => {
    let completed = false;
    const complete = () => {
      if (completed) return;
      completed = true;
      draft.clearDraft();
      onSuccess?.();
    };
    if (saving.current) return;
    saving.current = true;
    try {
      await submit(next, complete);
      complete();
    } finally {
      saving.current = false;
    }
  };

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();
    if (isPending || (mode === "update" && !dirty)) return;
    if (errorStatus.current) errorStatus.current.textContent = "";

    const result = taskSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      submittedForm.current = event.currentTarget;
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
        phaseAssignment: fieldErrors.phaseAssignment?.[0],
        estimatedBasis: fieldErrors.estimatedBasis?.[0],
        actualBasis: fieldErrors.actualBasis?.[0],
        parentTaskId: fieldErrors.parentTaskId?.[0],
        requirementId: fieldErrors.requirementId?.[0],
        tags: fieldErrors.tags?.[0],
        sortOrder: fieldErrors.sortOrder?.[0],
      });
      return;
    }

    if (
      section === "actual" &&
      values.actualMinutes &&
      (!/^\d+$/.test(values.actualMinutes.trim()) ||
        Number(values.actualMinutes) > 2147483647)
    ) {
      submittedForm.current = event.currentTarget;
      setErrors({ actualMinutes: "0以上の整数分で入力してください。" });
      return;
    }
    setErrors({});
    await save(result.data, onSubmit).catch(() => undefined);
  };

  const updateValue = <TKey extends keyof TaskFormValues>(
    field: TKey,
    value: TaskFormValues[TKey],
  ) => {
    if (errorStatus.current) errorStatus.current.textContent = "";
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

  const statusField = (
    <TaskSelectField
      label="ステータス"
      value={values.status}
      options={
        mode === "create"
          ? TASK_STATUS_OPTIONS.filter((option) => option.value !== "returned")
          : TASK_STATUS_OPTIONS
      }
      error={errors.status}
      onChange={(value) => {
        if (value === "done") {
          const next = {
            ...values,
            status: value,
            progressPercent: "100",
          };
          setValues(next);
          draft.persist(next);
        } else updateValue("status", value);
      }}
    />
  );
  const priorityField = (
    <TaskSelectField
      label="優先度"
      value={values.priority}
      options={TASK_PRIORITY_OPTIONS}
      error={errors.priority}
      onChange={(value) => updateValue("priority", value)}
    />
  );
  const assigneeField = (
    <TaskUserSelectField
      projectId={projectId}
      label="担当者（任意）"
      value={values.assigneeId}
      error={errors.assigneeId}
      onChange={(value) => updateValue("assigneeId", value)}
    />
  );
  const reasonField =
    mode === "update" ? (
      <Field>
        <FieldLabel htmlFor={reasonId}>
          {values.status === "returned" && initialValues.status !== "returned"
            ? "差し戻し理由（必須）"
            : "更新理由（任意）"}
        </FieldLabel>
        <Textarea
          id={reasonId}
          required={
            values.status === "returned" && initialValues.status !== "returned"
          }
          value={values.changeReason}
          onChange={(event) => updateValue("changeReason", event.target.value)}
        />
      </Field>
    ) : null;
  const typeField = (
    <TaskTypeField
      projectId={projectId}
      value={values.taskType}
      error={errors.taskType}
      onChange={(value) => updateValue("taskType", value)}
    />
  );
  const reporterField = (
    <TaskUserSelectField
      projectId={projectId}
      label="報告者"
      value={values.reporterId}
      error={errors.reporterId}
      placeholder={mode === "create" ? "登録者（自分）" : "未設定"}
      onChange={(value) => updateValue("reporterId", value)}
    />
  );
  const startDateField = (
    <DateField
      label="開始日"
      value={values.startDate}
      onChange={(value) => updateValue("startDate", value)}
    />
  );
  const dueDateField = (
    <DateField
      label="終了予定日"
      value={values.dueDate}
      onChange={(value) => updateValue("dueDate", value)}
    />
  );
  const parentField = (
    <TaskParentSelectField
      projectId={projectId}
      value={values.parentTaskId}
      error={errors.parentTaskId}
      excludedTaskId={currentTaskId}
      onChange={(value) => updateValue("parentTaskId", value)}
    />
  );
  const requirementField = fixedRequirementLabel ? (
    <div className="space-y-1 text-sm">
      <p className="font-medium">関連要件</p>
      <p className="break-words text-muted-foreground">
        {fixedRequirementLabel}
      </p>
    </div>
  ) : (
    <TaskRequirementSelectField
      projectId={projectId}
      value={values.requirementId}
      error={errors.requirementId}
      onChange={(value) => updateValue("requirementId", value)}
    />
  );
  const tagsField = (
    <TaskTagInput
      projectId={projectId}
      value={values.tags}
      error={errors.tags}
      onChange={(value) => updateValue("tags", value)}
    />
  );
  const phaseField = (
    <TaskPhaseSelectField
      projectId={projectId}
      value={values.phaseAssignment}
      retainedValue={
        mode === "update"
          ? (conflictValues ?? initialValues).phaseAssignment
          : undefined
      }
      error={errors.phaseAssignment}
      onChange={(value) => updateValue("phaseAssignment", value)}
    />
  );
  const progressField = (
    <NumberField
      label="進捗率"
      value={values.progressPercent}
      error={errors.progressPercent}
      suffix="%"
      onChange={(value) => updateValue("progressPercent", value)}
    />
  );
  return (
    <>
      <form
        ref={formRef}
        data-effort-dirty={
          section === "estimate"
            ? values.estimatedBasis !== initialValues.estimatedBasis ||
              values.phaseAssignment !== initialValues.phaseAssignment
            : undefined
        }
        data-effort-pending={section === "estimate" ? isPending : undefined}
        className={
          fullWidth
            ? "@container/task-form w-full"
            : "@container/task-form mx-auto w-full max-w-4xl"
        }
        aria-label={mode === "create" ? "タスクを作成" : "タスクの編集"}
        onSubmit={handleSubmit}
      >
        <div ref={errorStatus} role="status" className="sr-only" />
        <fieldset disabled={isPending} className="min-w-0">
          <legend className="sr-only">タスク入力</legend>
          <FieldGroup>
            {(!section || section === "title") && (
              <Field data-invalid={errors.title ? true : undefined}>
                <FieldLabel htmlFor={titleId}>タスク名</FieldLabel>
                <Input
                  id={titleId}
                  maxLength={255}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      (event.nativeEvent.isComposing ||
                        event.nativeEvent.keyCode === 229)
                    )
                      event.preventDefault();
                  }}
                  value={values.title}
                  placeholder="例：ログイン画面を確認する"
                  onChange={(event) => updateValue("title", event.target.value)}
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={
                    errors.title ? `${titleId}-error` : undefined
                  }
                  aria-required
                  autoFocus={mode === "create" || section === "title"}
                />
                <TaskFieldError id={titleId} error={errors.title} />
              </Field>
            )}
            {(!section || section === "description") && (
              <Field className="[&_textarea]:min-h-28">
                <FieldLabel htmlFor={descriptionId}>説明（任意）</FieldLabel>
                <MarkdownTextarea
                  id={descriptionId}
                  value={values.description}
                  placeholder="作業内容や完了の条件を入力"
                  onChange={(value) => updateValue("description", value)}
                />
              </Field>
            )}
            {section === "status" && (
              <>
                {statusField}
                {progressField}
                {reasonField}
              </>
            )}
            {section === "priority" && priorityField}
            {section === "assignee" && assigneeField}
            {section === "reporter" && reporterField}
            {section === "type" && typeField}
            {section === "startDate" && startDateField}
            {section === "dueDate" && dueDateField}
            {section === "progress" && progressField}
            {(!section || section === "properties") && (
              <>
                {detailedCreate && (
                  <h2 className="border-t pt-4 text-sm font-semibold">
                    基本情報
                  </h2>
                )}
                <div className="grid gap-4 @min-[35rem]/task-form:grid-cols-3">
                  {typeField}
                  {statusField}
                  {priorityField}
                </div>
                <div className="grid gap-4 @min-[35rem]/task-form:grid-cols-3">
                  {assigneeField}
                  {startDateField}
                  {dueDateField}
                  {!detailedCreate && progressField}
                </div>
                {detailedCreate ? (
                  <section className="space-y-4 border-t pt-4">
                    <h2 className="text-sm font-semibold">関連情報</h2>
                    <div className="grid items-start gap-4 @min-[29rem]/task-form:grid-cols-2">
                      {parentField}
                      {requirementField}
                      {tagsField}
                      {initialValues.phaseAssignment !== "unclassified" &&
                        phaseField}
                      {values.requirementId && (
                        <TaskSelectField
                          label="関連種別"
                          value={values.relationType}
                          options={TASK_RELATION_TYPE_OPTIONS}
                          onChange={(value) =>
                            updateValue("relationType", value)
                          }
                        />
                      )}
                    </div>
                  </section>
                ) : (
                  tagsField
                )}
                {reasonField}
                <details
                  open={section === "properties" || undefined}
                  className={
                    detailedCreate ? "border-t pt-4" : "rounded-lg border p-4"
                  }
                >
                  <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-ring">
                    {detailedCreate ? "その他の項目" : "関連・管理項目"}
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
                        aria-describedby={
                          errors.taskCode ? `${taskCodeId}-error` : undefined
                        }
                      />
                      {mode === "create" ? (
                        <FieldDescription>
                          未入力の場合は自動採番されます。
                        </FieldDescription>
                      ) : null}
                      <TaskFieldError id={taskCodeId} error={errors.taskCode} />
                    </Field>

                    <div className="grid gap-4 @min-[29rem]/task-form:grid-cols-2">
                      {reporterField}
                      {!detailedCreate && parentField}
                      {!detailedCreate && mode === "create" && requirementField}
                      {detailedCreate && progressField}
                    </div>

                    <NumberField
                      label="並び順"
                      value={values.sortOrder}
                      error={errors.sortOrder}
                      onChange={(value) => updateValue("sortOrder", value)}
                    />
                    {detailedCreate &&
                      initialValues.phaseAssignment === "unclassified" &&
                      phaseField}
                    {mode === "create" && !detailedCreate ? (
                      <TaskSelectField
                        label="関連種別"
                        value={values.relationType}
                        options={TASK_RELATION_TYPE_OPTIONS}
                        onChange={(value) => updateValue("relationType", value)}
                      />
                    ) : null}
                  </FieldGroup>
                </details>
              </>
            )}
            {section === "actual" && (
              <>
                <NumberField
                  label="実績工数"
                  value={values.actualMinutes}
                  suffix="分"
                  error={errors.actualMinutes}
                  onChange={(v) => updateValue("actualMinutes", v)}
                />
                <div className="grid gap-3 @min-[29rem]/task-form:grid-cols-2">
                  <DateField
                    label="実績開始日"
                    value={values.actualStartDate}
                    onChange={(v) => updateValue("actualStartDate", v)}
                  />
                  <DateField
                    label="実績終了日"
                    value={values.actualEndDate}
                    onChange={(v) => updateValue("actualEndDate", v)}
                  />
                </div>
                <TaskSelectField
                  label="実績工数の集計根拠"
                  value={values.actualBasis}
                  options={EFFORT_BASIS_OPTIONS}
                  onChange={(v) =>
                    updateValue(
                      "actualBasis",
                      v as TaskFormValues["actualBasis"],
                    )
                  }
                />
                <FieldDescription>
                  「自身の作業」の工数を合計します。「子の集計枠」と「未確認」の入力値は合計に加わりません。
                </FieldDescription>
              </>
            )}
            {section === "estimate" && (
              <>
                {phaseField}
                <TaskSelectField
                  label="見積工数の集計根拠"
                  value={values.estimatedBasis}
                  options={EFFORT_BASIS_OPTIONS}
                  onChange={(v) =>
                    updateValue(
                      "estimatedBasis",
                      v as TaskFormValues["estimatedBasis"],
                    )
                  }
                />
                <FieldDescription>
                  「子の集計枠」では子孫の見積を集計します。工程を変更しても子タスクの所属は維持されます。
                </FieldDescription>
              </>
            )}
            <FormApiError error={error} />
            {draft.storageError ? (
              <p role="alert" className="text-sm text-destructive">
                下書きを保存できません。画面を閉じる前に入力内容を控えてください。
              </p>
            ) : null}
            <TaskFormActions
              submitLabel={mode === "create" ? "タスクを作成" : "変更を保存"}
              isPending={isPending}
              disabled={mode === "update" && !dirty}
              onCancel={
                onCancel &&
                (() => {
                  draft.clearDraft();
                  onCancel();
                })
              }
            />
          </FieldGroup>
        </fieldset>
      </form>

      <DraftRestoreDialog
        open={!startupValues && Boolean(draft.pendingDraft)}
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
            await save(resolvedValues, onResolveConflict);
          }}
        />
      ) : null}
    </>
  );
}

"use client";

import { useState } from "react";

import { FormApiError } from "@/components/shared/forms/form-api-error";
import { FormSubmitButton } from "@/components/shared/forms/form-submit-button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { taskDependencySchema } from "../../schemas/task-dependency-schema";
import type {
  TaskDependencyFormErrors,
  TaskDependencyFormValues,
} from "../../types/task-dependency-form";
import { TaskParentSelectField } from "./task-parent-select-field";

type TaskDependencyFormProps = {
  projectId: number;
  currentTaskId: number;
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: TaskDependencyFormValues) => Promise<unknown>;
};

export function TaskDependencyForm({
  projectId,
  currentTaskId,
  isPending,
  error,
  onSubmit,
}: TaskDependencyFormProps) {
  const [values, setValues] = useState<TaskDependencyFormValues>({
    predecessorTaskId: "",
    successorTaskId: String(currentTaskId),
    lagDays: "0",
  });
  const [errors, setErrors] = useState<TaskDependencyFormErrors>({});

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) => {
    event.preventDefault();

    const result = taskDependencySchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        predecessorTaskId: fieldErrors.predecessorTaskId?.[0],
        successorTaskId: fieldErrors.successorTaskId?.[0],
        lagDays: fieldErrors.lagDays?.[0],
      });
      return;
    }

    setErrors({});
    await onSubmit(result.data)
      .then(() =>
        setValues({
          predecessorTaskId: "",
          successorTaskId: String(currentTaskId),
          lagDays: "0",
        })
      )
      .catch(() => undefined);
  };

  const updateValue = (
    field: keyof TaskDependencyFormValues,
    value: string
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="grid gap-4 md:grid-cols-3">
          <TaskParentSelectField
            projectId={projectId}
            label="依存元タスク"
            placeholder="依存元タスクを選択"
            value={values.predecessorTaskId}
            error={errors.predecessorTaskId}
            excludedTaskId={currentTaskId}
            onChange={(value) => updateValue("predecessorTaskId", value)}
          />
          <TaskParentSelectField
            projectId={projectId}
            label="依存先タスク"
            placeholder="依存先タスクを選択"
            value={values.successorTaskId}
            error={errors.successorTaskId}
            onChange={(value) => updateValue("successorTaskId", value)}
          />
          <DependencyNumberField
            label="ラグ日数"
            value={values.lagDays}
            error={errors.lagDays}
            onChange={(value) => updateValue("lagDays", value)}
          />
        </div>
        <FormApiError error={error} />
        <FormSubmitButton isPending={isPending}>依存関係追加</FormSubmitButton>
      </FieldGroup>
    </form>
  );
}

function DependencyNumberField({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel>{label}</FieldLabel>
      <Input
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

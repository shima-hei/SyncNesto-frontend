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
import { Textarea } from "@/components/ui/textarea";

import { taskCommentSchema } from "../../schemas/task-schema";
import type {
  TaskCommentFormErrors,
  TaskCommentFormValues,
} from "../../types/task-comment-form";

type TaskCommentFormProps = {
  initialValues?: TaskCommentFormValues;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: TaskCommentFormValues) => Promise<unknown>;
  onSuccess?: () => void;
};

const defaultValues: TaskCommentFormValues = {
  body: "",
};

export function TaskCommentForm({
  initialValues,
  submitLabel = "コメント追加",
  resetOnSuccess = true,
  isPending,
  error,
  onSubmit,
  onSuccess,
}: TaskCommentFormProps) {
  const [values, setValues] = useState(initialValues ?? defaultValues);
  const [errors, setErrors] = useState<TaskCommentFormErrors>({});

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) => {
    event.preventDefault();

    const result = taskCommentSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        body: fieldErrors.body?.[0],
      });
      return;
    }

    setErrors({});
    await onSubmit(result.data)
      .then(() => {
        if (resetOnSuccess) {
          setValues(defaultValues);
        }
        onSuccess?.();
      })
      .catch(() => undefined);
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field data-invalid={errors.body ? true : undefined}>
          <FieldLabel>コメント</FieldLabel>
          <Textarea
            value={values.body}
            onChange={(event) => {
              setValues({ body: event.target.value });
              setErrors((current) => ({ ...current, body: undefined }));
            }}
            aria-invalid={Boolean(errors.body)}
          />
          {errors.body ? <FieldError>{errors.body}</FieldError> : null}
        </Field>

        <FormApiError error={error} />
        <FormSubmitButton isPending={isPending}>{submitLabel}</FormSubmitButton>
      </FieldGroup>
    </form>
  );
}

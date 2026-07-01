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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { TASK_STATUS_OPTIONS } from "../../constants/task-options";
import { taskCommentSchema } from "../../schemas/task-schema";
import type {
  TaskCommentFormErrors,
  TaskCommentFormValues,
} from "../../types/task-comment-form";

type TaskCommentFormProps = {
  initialValues?: TaskCommentFormValues;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  enableStatusChange?: boolean;
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: TaskCommentFormValues) => Promise<unknown>;
  onSuccess?: () => void;
};

export const TASK_COMMENT_STATUS_UNCHANGED = "__unchanged";

const defaultValues: TaskCommentFormValues = {
  body: "",
  status: TASK_COMMENT_STATUS_UNCHANGED,
};

export function TaskCommentForm({
  initialValues,
  submitLabel = "コメント追加",
  resetOnSuccess = true,
  enableStatusChange = false,
  isPending,
  error,
  onSubmit,
  onSuccess,
}: TaskCommentFormProps) {
  const [values, setValues] = useState(initialValues ?? defaultValues);
  const [errors, setErrors] = useState<TaskCommentFormErrors>({});

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
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
              setValues((current) => ({
                ...current,
                body: event.target.value,
              }));
              setErrors((current) => ({ ...current, body: undefined }));
            }}
            aria-invalid={Boolean(errors.body)}
          />
          {errors.body ? <FieldError>{errors.body}</FieldError> : null}
        </Field>

        {enableStatusChange ? (
          <Field>
            <FieldLabel>ステータスも変更</FieldLabel>
            <Select
              value={values.status}
              onValueChange={(status) =>
                setValues((current) => ({ ...current, status }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={TASK_COMMENT_STATUS_UNCHANGED}>
                    変更しない
                  </SelectItem>
                  {TASK_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        ) : null}

        <FormApiError error={error} />
        <FormSubmitButton isPending={isPending}>{submitLabel}</FormSubmitButton>
      </FieldGroup>
    </form>
  );
}

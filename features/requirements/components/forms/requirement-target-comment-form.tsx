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

import { requirementTargetCommentSchema } from "../../schemas/requirement-schema";
import type {
  RequirementTargetCommentFormErrors,
  RequirementTargetCommentFormValues,
} from "../../types/requirement-target-comment-form";

type RequirementTargetCommentFormProps = {
  initialValues?: RequirementTargetCommentFormValues;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  showReason?: boolean;
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: RequirementTargetCommentFormValues) => Promise<unknown>;
  onSuccess?: () => void;
};

const defaultValues: RequirementTargetCommentFormValues = {
  body: "",
  reason: "",
};

export function RequirementTargetCommentForm({
  initialValues,
  submitLabel = "コメント追加",
  resetOnSuccess = true,
  showReason = false,
  isPending,
  error,
  onSubmit,
  onSuccess,
}: RequirementTargetCommentFormProps) {
  const [values, setValues] = useState(initialValues ?? defaultValues);
  const [errors, setErrors] = useState<RequirementTargetCommentFormErrors>({});

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) => {
    event.preventDefault();

    const result = requirementTargetCommentSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        body: fieldErrors.body?.[0],
        reason: fieldErrors.reason?.[0],
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
              setValues((current) => ({ ...current, body: event.target.value }));
              setErrors((current) => ({ ...current, body: undefined }));
            }}
            aria-invalid={Boolean(errors.body)}
          />
          {errors.body ? <FieldError>{errors.body}</FieldError> : null}
        </Field>

        {showReason ? (
          <Field>
            <FieldLabel>更新理由</FieldLabel>
            <Textarea
              value={values.reason}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
            />
          </Field>
        ) : null}

        <FormApiError error={error} />
        <FormSubmitButton isPending={isPending}>{submitLabel}</FormSubmitButton>
      </FieldGroup>
    </form>
  );
}

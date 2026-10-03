"use client";

import { useState } from "react";

import { MentionTextarea } from "@/components/shared/comments/mention-textarea";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { FormSubmitButton } from "@/components/shared/forms/form-submit-button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

import { requirementCommentSchema } from "../../schemas/requirement-schema";
import type {
  RequirementCommentFormErrors,
  RequirementCommentFormValues,
} from "../../types/requirement-comment-form";

type RequirementCommentFormProps = {
  projectId: number;
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: RequirementCommentFormValues) => Promise<unknown>;
};

const initialValues: RequirementCommentFormValues = {
  comment: "",
  mentions: [],
};

export function RequirementCommentForm({
  projectId,
  isPending,
  error,
  onSubmit,
}: RequirementCommentFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RequirementCommentFormErrors>({});

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();

    const result = requirementCommentSchema.safeParse(values);

    if (!result.success) {
      setErrors({
        comment: result.error.flatten().fieldErrors.comment?.[0],
      });
      return;
    }

    setErrors({});
    await onSubmit(result.data)
      .then(() => setValues(initialValues))
      .catch(() => undefined);
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field data-invalid={errors.comment ? true : undefined}>
          <FieldLabel>コメント</FieldLabel>
          <MentionTextarea
            projectId={projectId}
            permission="requirement:read"
            mentions={values.mentions}
            value={values.comment}
            onChange={(body, mentions) => {
              setValues({ comment: body, mentions });
              setErrors({});
            }}
            aria-invalid={Boolean(errors.comment)}
          />
          {errors.comment ? <FieldError>{errors.comment}</FieldError> : null}
        </Field>
        <FormApiError error={error} />
        <FormSubmitButton isPending={isPending}>コメント追加</FormSubmitButton>
      </FieldGroup>
    </form>
  );
}

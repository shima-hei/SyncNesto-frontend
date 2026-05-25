"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import { requirementCommentSchema } from "../../schemas/requirement-schema";
import type {
  RequirementCommentFormErrors,
  RequirementCommentFormValues,
} from "../../types/requirement-comment-form";

type RequirementCommentFormProps = {
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: RequirementCommentFormValues) => Promise<unknown>;
};

const initialValues: RequirementCommentFormValues = {
  comment: "",
};

export function RequirementCommentForm({
  isPending,
  error,
  onSubmit,
}: RequirementCommentFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RequirementCommentFormErrors>({});

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
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
          <Textarea
            value={values.comment}
            onChange={(event) => {
              setValues({ comment: event.target.value });
              setErrors({});
            }}
            aria-invalid={Boolean(errors.comment)}
          />
          {errors.comment ? <FieldError>{errors.comment}</FieldError> : null}
        </Field>
        {error ? <FieldError>{error.message}</FieldError> : null}
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            コメント追加
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

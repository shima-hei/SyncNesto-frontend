"use client";

import { useState } from "react";

import { FormApiError } from "@/components/shared/forms/form-api-error";
import { FormSubmitButton } from "@/components/shared/forms/form-submit-button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

import { requirementApprovalRequestSchema } from "../../schemas/requirement-schema";
import type {
  RequirementApprovalRequestFormErrors,
  RequirementApprovalRequestFormValues,
} from "../../types/requirement-approval-form";
import { RequirementUserSelectField } from "./requirement-user-select-field";

type RequirementApprovalRequestFormProps = {
  projectId: number;
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: RequirementApprovalRequestFormValues) => Promise<unknown>;
};

const initialValues: RequirementApprovalRequestFormValues = {
  approverId: "",
  comment: "",
};

export function RequirementApprovalRequestForm({
  projectId,
  isPending,
  error,
  onSubmit,
}: RequirementApprovalRequestFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RequirementApprovalRequestFormErrors>(
    {},
  );

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();

    const result = requirementApprovalRequestSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        approverId: fieldErrors.approverId?.[0],
        comment: fieldErrors.comment?.[0],
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
        <RequirementUserSelectField
          projectId={projectId}
          label="承認者"
          value={values.approverId}
          error={errors.approverId}
          onChange={(value) => {
            setValues((current) => ({
              ...current,
              approverId: value,
            }));
            setErrors((current) => ({ ...current, approverId: undefined }));
          }}
        />

        <Field>
          <FieldLabel>コメント</FieldLabel>
          <Textarea
            value={values.comment}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                comment: event.target.value,
              }))
            }
          />
        </Field>

        <FormApiError error={error} />
        <FormSubmitButton isPending={isPending}>承認申請</FormSubmitButton>
      </FieldGroup>
    </form>
  );
}

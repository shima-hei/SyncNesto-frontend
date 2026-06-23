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
import { Textarea } from "@/components/ui/textarea";
import type { RequirementDetailRead } from "@/lib/api/generated/model";

import { parseRequirementDetailJson } from "../../lib/requirement-mappers";
import type {
  RequirementDetailFormErrors,
  RequirementDetailFormValues,
} from "../../types/requirement-detail-form";

type RequirementDetailFormProps = {
  initialValues?: RequirementDetailFormValues;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: RequirementDetailFormValues) => Promise<unknown>;
  onSuccess?: () => void;
};

export function RequirementDetailForm({
  initialValues = defaultValues,
  submitLabel = "詳細追加",
  resetOnSuccess = true,
  isPending,
  error,
  onSubmit,
  onSuccess,
}: RequirementDetailFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RequirementDetailFormErrors>({});

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) => {
    event.preventDefault();

    const nextErrors: RequirementDetailFormErrors = {};

    if (!values.detailType.trim()) {
      nextErrors.detailType = "詳細種別を入力してください。";
    }

    try {
      parseRequirementDetailJson(values.detailJson);
    } catch {
      nextErrors.detailJson = "JSONオブジェクト形式で入力してください。";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    await onSubmit(values)
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
        <Field data-invalid={errors.detailType ? true : undefined}>
          <FieldLabel>詳細種別</FieldLabel>
          <Input
            value={values.detailType}
            placeholder="screen / api / database など"
            onChange={(event) => {
              setValues((current) => ({
                ...current,
                detailType: event.target.value,
              }));
              setErrors((current) => ({ ...current, detailType: undefined }));
            }}
            aria-invalid={Boolean(errors.detailType)}
          />
          {errors.detailType ? (
            <FieldError>{errors.detailType}</FieldError>
          ) : null}
        </Field>
        <Field data-invalid={errors.detailJson ? true : undefined}>
          <FieldLabel>詳細JSON</FieldLabel>
          <Textarea
            value={values.detailJson}
            className="min-h-40 font-mono"
            onChange={(event) => {
              setValues((current) => ({
                ...current,
                detailJson: event.target.value,
              }));
              setErrors((current) => ({ ...current, detailJson: undefined }));
            }}
            aria-invalid={Boolean(errors.detailJson)}
          />
          {errors.detailJson ? (
            <FieldError>{errors.detailJson}</FieldError>
          ) : null}
        </Field>
        <FormApiError error={error} />
        <FormSubmitButton isPending={isPending}>{submitLabel}</FormSubmitButton>
      </FieldGroup>
    </form>
  );
}

export const getRequirementDetailFormValues = (
  detail: RequirementDetailRead
): RequirementDetailFormValues => {
  return {
    detailType: detail.detail_type,
    detailJson: JSON.stringify(detail.detail_json ?? {}, null, 2),
  };
};

const defaultValues: RequirementDetailFormValues = {
  detailType: "",
  detailJson: "{\n  \n}",
};

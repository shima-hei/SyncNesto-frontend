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

import {
  REQUIREMENT_RELATION_TARGET_TYPE_OPTIONS,
  REQUIREMENT_RELATION_TYPE_OPTIONS,
} from "../../constants/requirement-options";
import { requirementRelationSchema } from "../../schemas/requirement-schema";
import type {
  RequirementRelationFormErrors,
  RequirementRelationFormValues,
} from "../../types/requirement-relation-form";
import { RequirementRelationTargetSelectField } from "./requirement-relation-target-select-field";
import { RequirementSelectField } from "./requirement-select-field";

type RequirementRelationFormProps = {
  projectId: number;
  documentId: number;
  excludedRequirementIds?: number[];
  excludedTargetIdsByType?: Record<string, string[]>;
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: RequirementRelationFormValues) => Promise<unknown>;
};

const initialValues: RequirementRelationFormValues = {
  targetType: "requirement_item",
  targetId: "",
  relationType: "related_to",
  description: "",
};

export function RequirementRelationForm({
  projectId,
  documentId,
  excludedRequirementIds = [],
  excludedTargetIdsByType = {},
  isPending,
  error,
  onSubmit,
}: RequirementRelationFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RequirementRelationFormErrors>({});

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();

    const result = requirementRelationSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        targetType: fieldErrors.targetType?.[0],
        targetId: fieldErrors.targetId?.[0],
        relationType: fieldErrors.relationType?.[0],
        description: fieldErrors.description?.[0],
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
        <div className="grid gap-4 md:grid-cols-3">
          <Field data-invalid={errors.targetType ? true : undefined}>
            <FieldLabel>関連先の種類</FieldLabel>
            <Select
              value={values.targetType}
              onValueChange={(value) => {
                setValues((current) => ({
                  ...current,
                  targetType: value,
                  targetId: "",
                }));
                setErrors((current) => ({ ...current, targetType: undefined }));
              }}
            >
              <SelectTrigger aria-invalid={Boolean(errors.targetType)}>
                <SelectValue placeholder="対象種別を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {REQUIREMENT_RELATION_TARGET_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.targetType ? (
              <FieldError>{errors.targetType}</FieldError>
            ) : null}
          </Field>

          {values.targetType === "requirement_item" ? (
            <RequirementSelectField
              projectId={projectId}
              documentId={documentId}
              label="関連先"
              value={values.targetId}
              error={errors.targetId}
              excludedRequirementIds={excludedRequirementIds}
              onChange={(value) => {
                setValues((current) => ({ ...current, targetId: value }));
                setErrors((current) => ({ ...current, targetId: undefined }));
              }}
            />
          ) : (
            <RequirementRelationTargetSelectField
              projectId={projectId}
              documentId={documentId}
              targetType={values.targetType}
              label="関連先"
              value={values.targetId}
              error={errors.targetId}
              excludedTargetIds={excludedTargetIdsByType[values.targetType]}
              onChange={(value) => {
                setValues((current) => ({ ...current, targetId: value }));
                setErrors((current) => ({ ...current, targetId: undefined }));
              }}
            />
          )}

          <Field data-invalid={errors.relationType ? true : undefined}>
            <FieldLabel>関連種別</FieldLabel>
            <Select
              value={values.relationType}
              onValueChange={(value) => {
                setValues((current) => ({ ...current, relationType: value }));
                setErrors((current) => ({
                  ...current,
                  relationType: undefined,
                }));
              }}
            >
              <SelectTrigger aria-invalid={Boolean(errors.relationType)}>
                <SelectValue placeholder="関連種別を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {REQUIREMENT_RELATION_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.relationType ? (
              <FieldError>{errors.relationType}</FieldError>
            ) : null}
          </Field>
        </div>

        <Field>
          <FieldLabel>関係のメモ</FieldLabel>
          <Textarea
            value={values.description}
            placeholder="例: この要件が完了しないと、関連先の要件を確定できない"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
        </Field>

        <FormApiError error={error} />
        <FormSubmitButton isPending={isPending}>関連を追加</FormSubmitButton>
      </FieldGroup>
    </form>
  );
}

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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { REQUIREMENT_OPEN_ISSUE_STATUS_OPTIONS } from "../../constants/requirement-options";
import { requirementOpenIssueSchema } from "../../schemas/requirement-schema";
import type {
  RequirementOpenIssueFormErrors,
  RequirementOpenIssueFormValues,
} from "../../types/requirement-open-issue-form";
import { RequirementSelectField } from "./requirement-select-field";
import { RequirementUserSelectField } from "./requirement-user-select-field";

type RequirementOpenIssueFormProps = {
  projectId: number;
  documentId: number;
  initialValues?: RequirementOpenIssueFormValues;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  showReason?: boolean;
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: RequirementOpenIssueFormValues) => Promise<unknown>;
  onSuccess?: () => void;
};

const defaultOpenIssueValues: RequirementOpenIssueFormValues = {
  issueCode: "",
  title: "",
  description: "",
  impactScope: "",
  relatedRequirementId: "",
  assigneeId: "",
  dueDate: "",
  status: "open",
  resolution: "",
  reason: "",
};

export function RequirementOpenIssueForm({
  projectId,
  documentId,
  initialValues,
  submitLabel = "未決事項追加",
  resetOnSuccess = true,
  showReason = false,
  isPending,
  error,
  onSubmit,
  onSuccess,
}: RequirementOpenIssueFormProps) {
  const isUpdate = Boolean(initialValues);
  const [values, setValues] = useState(
    initialValues ?? defaultOpenIssueValues
  );
  const [errors, setErrors] = useState<RequirementOpenIssueFormErrors>({});

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) => {
    event.preventDefault();

    const result = requirementOpenIssueSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        title: fieldErrors.title?.[0],
        description: fieldErrors.description?.[0],
        impactScope: fieldErrors.impactScope?.[0],
        relatedRequirementId: fieldErrors.relatedRequirementId?.[0],
        assigneeId: fieldErrors.assigneeId?.[0],
        dueDate: fieldErrors.dueDate?.[0],
        status: fieldErrors.status?.[0],
        resolution: fieldErrors.resolution?.[0],
        reason: fieldErrors.reason?.[0],
      });
      return;
    }

    setErrors({});
    await onSubmit(result.data)
      .then(() => {
        if (resetOnSuccess) {
          setValues(defaultOpenIssueValues);
        }
        onSuccess?.();
      })
      .catch(() => undefined);
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="grid gap-4 md:grid-cols-2">
          {isUpdate ? (
            <Field>
              <FieldLabel>未決事項ID</FieldLabel>
              <Input value={values.issueCode} readOnly disabled />
            </Field>
          ) : null}

          <Field data-invalid={errors.status ? true : undefined}>
            <FieldLabel>ステータス</FieldLabel>
            <Select
              value={values.status}
              onValueChange={(value) => {
                setValues((current) => ({ ...current, status: value }));
                setErrors((current) => ({ ...current, status: undefined }));
              }}
            >
              <SelectTrigger aria-invalid={Boolean(errors.status)}>
                <SelectValue placeholder="ステータスを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {REQUIREMENT_OPEN_ISSUE_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.status ? <FieldError>{errors.status}</FieldError> : null}
          </Field>
        </div>

        <Field data-invalid={errors.title ? true : undefined}>
          <FieldLabel>論点</FieldLabel>
          <Input
            value={values.title}
            onChange={(event) => {
              setValues((current) => ({ ...current, title: event.target.value }));
              setErrors((current) => ({ ...current, title: undefined }));
            }}
            aria-invalid={Boolean(errors.title)}
          />
          {errors.title ? <FieldError>{errors.title}</FieldError> : null}
        </Field>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Field>
            <FieldLabel>影響範囲</FieldLabel>
            <Input
              value={values.impactScope}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  impactScope: event.target.value,
                }))
              }
            />
          </Field>
          <RequirementSelectField
            projectId={projectId}
            documentId={documentId}
            label="関連要件"
            value={values.relatedRequirementId}
            error={errors.relatedRequirementId}
            onChange={(value) => {
              setValues((current) => ({
                ...current,
                relatedRequirementId: value,
              }));
              setErrors((current) => ({
                ...current,
                relatedRequirementId: undefined,
              }));
            }}
          />
          <RequirementUserSelectField
            projectId={projectId}
            label="担当者"
            value={values.assigneeId}
            error={errors.assigneeId}
            onChange={(value) => {
              setValues((current) => ({
                ...current,
                assigneeId: value,
              }));
              setErrors((current) => ({ ...current, assigneeId: undefined }));
            }}
          />
          <Field>
            <FieldLabel>期限</FieldLabel>
            <Input
              type="date"
              value={values.dueDate}
              onChange={(event) =>
                setValues((current) => ({ ...current, dueDate: event.target.value }))
              }
            />
          </Field>
        </div>

        <Field>
          <FieldLabel>説明</FieldLabel>
          <Textarea
            value={values.description}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
        </Field>

        <Field>
          <FieldLabel>解決内容</FieldLabel>
          <Textarea
            value={values.resolution}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                resolution: event.target.value,
              }))
            }
          />
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

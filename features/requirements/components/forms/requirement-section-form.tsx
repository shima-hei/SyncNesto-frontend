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

import { REQUIREMENT_SECTION_TEMPLATES } from "../../constants/requirement-section-templates";
import {
  REQUIREMENT_DOCUMENT_STATUS_OPTIONS,
  REQUIREMENT_SECTION_TYPE_OPTIONS,
} from "../../constants/requirement-options";
import { requirementSectionSchema } from "../../schemas/requirement-schema";
import type {
  RequirementSectionFormErrors,
  RequirementSectionFormValues,
} from "../../types/requirement-section-form";
import { MarkdownTextarea } from "@/components/shared/forms/markdown-textarea";

type RequirementSectionFormProps = {
  initialValues?: RequirementSectionFormValues;
  nextSortOrder?: number;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: RequirementSectionFormValues) => Promise<unknown>;
  onSuccess?: () => void;
};

export function RequirementSectionForm({
  initialValues,
  nextSortOrder = 10,
  submitLabel = "セクション追加",
  resetOnSuccess = true,
  isPending,
  error,
  onSubmit,
  onSuccess,
}: RequirementSectionFormProps) {
  const defaultValues: RequirementSectionFormValues = initialValues ?? {
    title: "",
    sectionType: "overview",
    content: "",
    sortOrder: String(nextSortOrder),
    status: "draft",
  };
  const [values, setValues] = useState<RequirementSectionFormValues>(defaultValues);
  const [errors, setErrors] = useState<RequirementSectionFormErrors>({});
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("");

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) => {
    event.preventDefault();

    const result = requirementSectionSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        title: fieldErrors.title?.[0],
        sectionType: fieldErrors.sectionType?.[0],
        content: fieldErrors.content?.[0],
        sortOrder: fieldErrors.sortOrder?.[0],
        status: fieldErrors.status?.[0],
      });
      return;
    }

    setErrors({});
    await onSubmit(result.data)
      .then(() => {
        if (resetOnSuccess) {
          setValues({
            title: "",
            sectionType: "overview",
            content: "",
            sortOrder: String(nextSortOrder + 10),
            status: "draft",
          });
          setSelectedTemplateKey("");
        }
        onSuccess?.();
      })
      .catch(() => undefined);
  };

  const handleTemplateChange = (templateKey: string) => {
    const template = REQUIREMENT_SECTION_TEMPLATES.find(
      (item) => item.key === templateKey
    );

    setSelectedTemplateKey(templateKey);

    if (!template) {
      return;
    }

    setValues((current) => ({
      ...current,
      title: template.title,
      sectionType: template.sectionType,
      content: template.content,
    }));
    setErrors((current) => ({
      ...current,
      title: undefined,
      sectionType: undefined,
      content: undefined,
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        {!initialValues ? (
          <Field>
            <FieldLabel>テンプレート</FieldLabel>
            <Select
              value={selectedTemplateKey}
              onValueChange={handleTemplateChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="テンプレートから追加" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {REQUIREMENT_SECTION_TEMPLATES.map((template) => (
                    <SelectItem key={template.key} value={template.key}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        ) : null}

        <Field data-invalid={errors.title ? true : undefined}>
          <FieldLabel>セクション名</FieldLabel>
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

        <div className="grid gap-4 md:grid-cols-2">
          <Field data-invalid={errors.sectionType ? true : undefined}>
            <FieldLabel>種別</FieldLabel>
            <Select
              value={values.sectionType}
              onValueChange={(value) => {
                setValues((current) => ({ ...current, sectionType: value }));
                setErrors((current) => ({ ...current, sectionType: undefined }));
              }}
            >
              <SelectTrigger aria-invalid={Boolean(errors.sectionType)}>
                <SelectValue placeholder="種別を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {REQUIREMENT_SECTION_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.sectionType ? (
              <FieldError>{errors.sectionType}</FieldError>
            ) : null}
          </Field>

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
                  {REQUIREMENT_DOCUMENT_STATUS_OPTIONS.map((option) => (
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

        <Field>
          <FieldLabel>本文</FieldLabel>
          <MarkdownTextarea
            value={values.content}
            placeholder="Markdown形式で本文を入力"
            onChange={(content) =>
              setValues((current) => ({ ...current, content }))
            }
          />
        </Field>

        <FormApiError error={error} />
        <FormSubmitButton isPending={isPending}>{submitLabel}</FormSubmitButton>
      </FieldGroup>
    </form>
  );
}

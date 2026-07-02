"use client";

import { useState } from "react";

import { FormApiError } from "@/components/shared/forms/form-api-error";
import { FormSubmitButton } from "@/components/shared/forms/form-submit-button";
import {
  Field,
  FieldDescription,
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

import {
  REQUIREMENT_LINK_STATUS_OPTIONS,
  REQUIREMENT_LINK_TYPE_OPTIONS,
} from "../../constants/requirement-options";
import { requirementLinkSchema } from "../../schemas/requirement-schema";
import type {
  RequirementLinkFormErrors,
  RequirementLinkFormValues,
} from "../../types/requirement-link-form";

type RequirementLinkFormProps = {
  isPending: boolean;
  error?: Error | null;
  initialValues?: RequirementLinkFormValues;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  onSubmit: (values: RequirementLinkFormValues) => Promise<unknown>;
};

const defaultValues: RequirementLinkFormValues = {
  linkedType: "api",
  linkedId: "",
  linkedUrl: "",
  status: "unknown",
};

const REFERENCE_PLACEHOLDERS: Record<string, string> = {
  screen: "例: ログイン画面",
  api: "例: POST /auth/login",
  database: "例: users テーブル",
  task: "例: TASK-001",
  test_case: "例: TC-001 ログイン成功",
  document: "例: 基本設計書 3.2",
  project: "例: 管理画面リニューアル",
};

const REFERENCE_DESCRIPTIONS: Record<string, string> = {
  screen: "この要件に関係する画面名を入力します。",
  api: "この要件に関係するAPIのメソッドとパスを入力します。",
  database: "この要件に関係するテーブル名やデータ名を入力します。",
  task: "この要件に関係するタスクコードやタスク名を入力します。",
  test_case: "この要件に関係するテストケース番号や名称を入力します。",
  document: "この要件に関係する資料名、章番号、URLなどを入力します。",
  project: "この要件に関係するプロジェクト名を入力します。",
};

export function RequirementLinkForm({
  isPending,
  error,
  initialValues = defaultValues,
  submitLabel = "関連成果物追加",
  resetOnSuccess = true,
  onSubmit,
}: RequirementLinkFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RequirementLinkFormErrors>({});

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();

    const result = requirementLinkSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        linkedType: fieldErrors.linkedType?.[0],
        linkedId: fieldErrors.linkedId?.[0],
        linkedUrl: fieldErrors.linkedUrl?.[0],
        status: fieldErrors.status?.[0],
      });
      return;
    }

    setErrors({});
    await onSubmit(result.data)
      .then(() => {
        if (resetOnSuccess) {
          setValues(defaultValues);
        }
      })
      .catch(() => undefined);
  };

  const updateValue = <TKey extends keyof RequirementLinkFormValues>(
    field: TKey,
    value: RequirementLinkFormValues[TKey],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="grid gap-3 md:grid-cols-[180px_1fr]">
          <Field data-invalid={errors.linkedType ? true : undefined}>
            <FieldLabel>種別</FieldLabel>
            <Select
              value={values.linkedType}
              onValueChange={(value) => updateValue("linkedType", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="種別を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {REQUIREMENT_LINK_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.linkedType ? (
              <FieldError>{errors.linkedType}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={errors.linkedId ? true : undefined}>
            <FieldLabel>参照先</FieldLabel>
            <Input
              value={values.linkedId}
              onChange={(event) => updateValue("linkedId", event.target.value)}
              placeholder={REFERENCE_PLACEHOLDERS[values.linkedType]}
              aria-invalid={Boolean(errors.linkedId)}
            />
            <FieldDescription>
              {REFERENCE_DESCRIPTIONS[values.linkedType]}
            </FieldDescription>
            {errors.linkedId ? (
              <FieldError>{errors.linkedId}</FieldError>
            ) : null}
          </Field>
        </div>
        <Field data-invalid={errors.linkedUrl ? true : undefined}>
          <FieldLabel>成果物リンク</FieldLabel>
          <Input
            value={values.linkedUrl}
            onChange={(event) => updateValue("linkedUrl", event.target.value)}
            placeholder="例: https://example.com/design/login"
            aria-invalid={Boolean(errors.linkedUrl)}
          />
          <FieldDescription>
            Figma、API仕様、Google
            Drive、GitHubなど、成果物を開くURLを入力します。未完成の場合は空欄で登録できます。
          </FieldDescription>
          {errors.linkedUrl ? (
            <FieldError>{errors.linkedUrl}</FieldError>
          ) : null}
        </Field>
        <Field data-invalid={errors.status ? true : undefined}>
          <FieldLabel>成果物状態</FieldLabel>
          <Select
            value={values.status}
            onValueChange={(value) => updateValue("status", value)}
          >
            <SelectTrigger
              className="w-full"
              aria-invalid={Boolean(errors.status)}
            >
              <SelectValue placeholder="成果物状態を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {REQUIREMENT_LINK_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            成果物がまだない場合は未作成、完成後は完成または確認済みにします。
          </FieldDescription>
          {errors.status ? <FieldError>{errors.status}</FieldError> : null}
        </Field>
        <FormApiError error={error} />
        <FormSubmitButton isPending={isPending}>{submitLabel}</FormSubmitButton>
      </FieldGroup>
    </form>
  );
}

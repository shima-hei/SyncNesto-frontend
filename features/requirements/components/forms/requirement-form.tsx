"use client";

import { useId, useState } from "react";

import { ConflictResolutionDialog } from "@/components/shared/dialogs/conflict-resolution-dialog";
import { Button } from "@/components/ui/button";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { getConflictFields } from "@/lib/api/conflict";

import {
  REQUIREMENT_PRIORITY_OPTIONS,
  REQUIREMENT_STATUS_OPTIONS,
  REQUIREMENT_TYPE_OPTIONS,
} from "../../constants/requirement-options";
import { requirementSchema } from "../../schemas/requirement-schema";
import type {
  RequirementFormErrors,
  RequirementFormValues,
} from "../../types/requirement-form";

type RequirementFormProps = {
  mode: "create" | "update";
  initialValues: RequirementFormValues;
  isPending: boolean;
  error?: Error | null;
  conflictValues?: RequirementFormValues | null;
  onCloseConflict?: () => void;
  onResolveConflict?: (values: RequirementFormValues) => Promise<unknown>;
  onSubmit: (values: RequirementFormValues) => Promise<unknown>;
};

export function RequirementForm({
  mode,
  initialValues,
  isPending,
  error,
  conflictValues,
  onCloseConflict,
  onResolveConflict,
  onSubmit,
}: RequirementFormProps) {
  const requirementCodeId = useId();
  const categoryId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const rationaleId = useId();
  const acceptanceCriteriaId = useId();
  const sourceId = useId();
  const ownerId = useId();
  const approvedById = useId();
  const approvedAtId = useId();
  const changeSummaryId = useId();
  const reasonId = useId();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RequirementFormErrors>({});
  const conflictFields = conflictValues
    ? getConflictFields({
        original: initialValues as unknown as Record<string, unknown>,
        local: values as unknown as Record<string, unknown>,
        current: conflictValues as unknown as Record<string, unknown>,
      })
    : [];

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) => {
    event.preventDefault();

    const result = requirementSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        requirementCode: fieldErrors.requirementCode?.[0],
        requirementType: fieldErrors.requirementType?.[0],
        title: fieldErrors.title?.[0],
        priority: fieldErrors.priority?.[0],
        status: fieldErrors.status?.[0],
      });
      return;
    }

    setErrors({});
    await onSubmit(result.data).catch(() => undefined);
  };

  const updateValue = <TKey extends keyof RequirementFormValues>(
    field: TKey,
    value: RequirementFormValues[TKey]
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <>
      <form className="max-w-4xl" onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="grid gap-4 md:grid-cols-4">
            <Field data-invalid={errors.requirementCode ? true : undefined}>
              <FieldLabel htmlFor={requirementCodeId}>要件コード</FieldLabel>
              <Input
                id={requirementCodeId}
                value={values.requirementCode}
                onChange={(event) =>
                  updateValue("requirementCode", event.target.value)
                }
                aria-invalid={Boolean(errors.requirementCode)}
              />
              {errors.requirementCode ? (
                <FieldError>{errors.requirementCode}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={errors.requirementType ? true : undefined}>
              <FieldLabel>種別</FieldLabel>
              <Select
                value={values.requirementType}
                onValueChange={(value) => updateValue("requirementType", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="種別を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {REQUIREMENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.requirementType ? (
                <FieldError>{errors.requirementType}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={errors.priority ? true : undefined}>
              <FieldLabel>優先度</FieldLabel>
              <Select
                value={values.priority}
                onValueChange={(value) => updateValue("priority", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="優先度を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {REQUIREMENT_PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.priority ? (
                <FieldError>{errors.priority}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={errors.status ? true : undefined}>
              <FieldLabel>ステータス</FieldLabel>
              <Select
                value={values.status}
                onValueChange={(value) => updateValue("status", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="ステータスを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {REQUIREMENT_STATUS_OPTIONS.map((option) => (
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
            <FieldLabel htmlFor={categoryId}>カテゴリ</FieldLabel>
            <Input
              id={categoryId}
              value={values.category}
              onChange={(event) => updateValue("category", event.target.value)}
            />
          </Field>

          <Field data-invalid={errors.title ? true : undefined}>
            <FieldLabel htmlFor={titleId}>タイトル</FieldLabel>
            <Input
              id={titleId}
              value={values.title}
              onChange={(event) => updateValue("title", event.target.value)}
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title ? <FieldError>{errors.title}</FieldError> : null}
          </Field>

          <Field>
            <FieldLabel htmlFor={descriptionId}>説明</FieldLabel>
            <Textarea
              id={descriptionId}
              value={values.description}
              onChange={(event) =>
                updateValue("description", event.target.value)
              }
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={rationaleId}>理由</FieldLabel>
              <Textarea
                id={rationaleId}
                value={values.rationale}
                onChange={(event) =>
                  updateValue("rationale", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={acceptanceCriteriaId}>受け入れ条件</FieldLabel>
              <Textarea
                id={acceptanceCriteriaId}
                value={values.acceptanceCriteria}
                onChange={(event) =>
                  updateValue("acceptanceCriteria", event.target.value)
                }
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Field>
              <FieldLabel htmlFor={sourceId}>情報源</FieldLabel>
              <Input
                id={sourceId}
                value={values.source}
                onChange={(event) => updateValue("source", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={ownerId}>担当者ID</FieldLabel>
              <Input
                id={ownerId}
                inputMode="numeric"
                value={values.ownerId}
                onChange={(event) => updateValue("ownerId", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={approvedById}>承認者ID</FieldLabel>
              <Input
                id={approvedById}
                inputMode="numeric"
                value={values.approvedBy}
                onChange={(event) =>
                  updateValue("approvedBy", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={approvedAtId}>承認日時</FieldLabel>
              <Input
                id={approvedAtId}
                type="datetime-local"
                value={values.approvedAt}
                onChange={(event) =>
                  updateValue("approvedAt", event.target.value)
                }
              />
            </Field>
          </div>

          {mode === "update" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={changeSummaryId}>変更概要</FieldLabel>
                <Input
                  id={changeSummaryId}
                  value={values.changeSummary}
                  onChange={(event) =>
                    updateValue("changeSummary", event.target.value)
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={reasonId}>変更理由</FieldLabel>
                <Input
                  id={reasonId}
                  value={values.reason}
                  onChange={(event) => updateValue("reason", event.target.value)}
                />
              </Field>
            </div>
          ) : null}

          {error ? <FieldError>{error.message}</FieldError> : null}

          <Field>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              {mode === "create" ? "登録" : "更新"}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      {conflictValues && onCloseConflict && onResolveConflict ? (
        <ConflictResolutionDialog
          open
          fields={conflictFields}
          localValues={values}
          currentValues={conflictValues}
          fieldLabels={REQUIREMENT_CONFLICT_FIELD_LABELS}
          isPending={isPending}
          onOpenChange={(open) => !open && onCloseConflict()}
          onResolve={async (resolvedValues) => {
            setValues(resolvedValues);
            await onResolveConflict(resolvedValues);
          }}
        />
      ) : null}
    </>
  );
}

const REQUIREMENT_CONFLICT_FIELD_LABELS = {
  requirementCode: "要件コード",
  requirementType: "種別",
  category: "カテゴリ",
  title: "タイトル",
  description: "説明",
  rationale: "理由",
  acceptanceCriteria: "受け入れ条件",
  priority: "優先度",
  status: "ステータス",
  source: "情報源",
  ownerId: "担当者ID",
  approvedBy: "承認者ID",
  approvedAt: "承認日時",
  changeSummary: "変更概要",
  reason: "変更理由",
} satisfies Partial<Record<keyof RequirementFormValues, string>>;

"use client";

import { useId, useState } from "react";

import { ConflictResolutionDialog } from "@/components/shared/dialogs/conflict-resolution-dialog";
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
import { getConflictFields } from "@/lib/api/conflict";

import { MILESTONE_CONFLICT_FIELD_LABELS } from "../../constants/milestone-conflict-fields";
import { MILESTONE_STATUS_OPTIONS } from "../../constants/task-options";
import { milestoneSchema } from "../../schemas/milestone-schema";
import type {
  MilestoneFormErrors,
  MilestoneFormValues,
} from "../../types/milestone-form";

type MilestoneFormProps = {
  mode: "create" | "update";
  initialValues: MilestoneFormValues;
  isPending: boolean;
  error?: Error | null;
  conflictValues?: MilestoneFormValues | null;
  onCloseConflict?: () => void;
  onResolveConflict?: (values: MilestoneFormValues) => Promise<unknown>;
  onSubmit: (values: MilestoneFormValues) => Promise<unknown>;
};

export function MilestoneForm({
  mode,
  initialValues,
  isPending,
  error,
  conflictValues,
  onCloseConflict,
  onResolveConflict,
  onSubmit,
}: MilestoneFormProps) {
  const titleId = useId();
  const descriptionId = useId();
  const targetDateId = useId();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<MilestoneFormErrors>({});

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();

    const result = milestoneSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        title: fieldErrors.title?.[0],
        targetDate: fieldErrors.targetDate?.[0],
        status: fieldErrors.status?.[0],
      });
      return;
    }

    setErrors({});
    await onSubmit(result.data).catch(() => undefined);
  };

  const updateValue = <TKey extends keyof MilestoneFormValues>(
    field: TKey,
    value: MilestoneFormValues[TKey],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const conflictFields = conflictValues
    ? getConflictFields({
        original: initialValues as Record<string, unknown>,
        local: values as Record<string, unknown>,
        current: conflictValues as Record<string, unknown>,
      })
    : [];

  return (
    <>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="grid gap-4 md:grid-cols-2">
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
            <Field data-invalid={errors.targetDate ? true : undefined}>
              <FieldLabel htmlFor={targetDateId}>目標日</FieldLabel>
              <Input
                id={targetDateId}
                type="date"
                value={values.targetDate}
                onChange={(event) =>
                  updateValue("targetDate", event.target.value)
                }
                aria-invalid={Boolean(errors.targetDate)}
              />
              {errors.targetDate ? (
                <FieldError>{errors.targetDate}</FieldError>
              ) : null}
            </Field>
          </div>

          <Field data-invalid={errors.status ? true : undefined}>
            <FieldLabel>ステータス</FieldLabel>
            <Select
              value={values.status}
              onValueChange={(value) => updateValue("status", value)}
            >
              <SelectTrigger
                className="w-full"
                aria-invalid={Boolean(errors.status)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {MILESTONE_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.status ? <FieldError>{errors.status}</FieldError> : null}
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

          <FormApiError error={error} />
          <FormSubmitButton isPending={isPending}>
            {mode === "create" ? "登録" : "更新"}
          </FormSubmitButton>
        </FieldGroup>
      </form>

      {conflictValues && onCloseConflict && onResolveConflict ? (
        <ConflictResolutionDialog
          open
          fields={conflictFields}
          localValues={values}
          currentValues={conflictValues}
          fieldLabels={MILESTONE_CONFLICT_FIELD_LABELS}
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

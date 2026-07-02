"use client";

import { useMemo, useState } from "react";

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
import type { RequirementDetailRead } from "@/lib/api/generated/model";

import {
  DISPLAY_DETAIL_TYPE,
  getDefaultRequirementDetailFormValues,
  getRequirementDetailDefinition,
  IMPLEMENTATION_UNIT_DETAIL_TYPE,
  INPUT_DETAIL_TYPE,
  PARENT_SCREEN_FIELD,
  PARENT_UNIT_FIELD,
  REQUIREMENT_DETAIL_DEFINITIONS,
} from "../../lib/requirement-detail-metadata";
import {
  getRequirementDetailScreenOptions,
  getRequirementDetailUnitOptions,
} from "../../lib/requirement-detail-tree";
import type {
  RequirementDetailFormErrors,
  RequirementDetailFormValues,
} from "../../types/requirement-detail-form";

type RequirementDetailFormProps = {
  initialValues?: RequirementDetailFormValues;
  details?: RequirementDetailRead[];
  allowedDetailTypes?: readonly string[];
  fixedFieldKeys?: readonly string[];
  submitLabel?: string;
  resetOnSuccess?: boolean;
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: RequirementDetailFormValues) => Promise<unknown>;
  onSuccess?: () => void;
};

export function RequirementDetailForm({
  initialValues,
  details = [],
  allowedDetailTypes,
  fixedFieldKeys = [],
  submitLabel = "実現内容を追加",
  resetOnSuccess = true,
  isPending,
  error,
  onSubmit,
  onSuccess,
}: RequirementDetailFormProps) {
  const selectableDefinitions = useMemo(() => {
    return allowedDetailTypes?.length
      ? REQUIREMENT_DETAIL_DEFINITIONS.filter((definition) =>
          allowedDetailTypes.includes(definition.value),
        )
      : REQUIREMENT_DETAIL_DEFINITIONS;
  }, [allowedDetailTypes]);
  const [values, setValues] = useState(
    initialValues ??
      getDefaultRequirementDetailFormValues(selectableDefinitions[0].value),
  );
  const [errors, setErrors] = useState<RequirementDetailFormErrors>({});
  const fixedFieldKeySet = useMemo(
    () => new Set(fixedFieldKeys),
    [fixedFieldKeys],
  );
  const fixedParentUnitId = fixedFieldKeySet.has(PARENT_UNIT_FIELD)
    ? (initialValues?.fields[PARENT_UNIT_FIELD] ?? "")
    : "";
  const fixedParentScreenId = fixedFieldKeySet.has(PARENT_SCREEN_FIELD)
    ? (initialValues?.fields[PARENT_SCREEN_FIELD] ?? "")
    : "";
  const detailDefinition = getRequirementDetailDefinition(values.detailType);
  const unitOptions = getRequirementDetailUnitOptions(details);
  const screenOptions = getRequirementDetailScreenOptions(
    details,
    values.fields[PARENT_UNIT_FIELD],
  );
  const shouldSelectUnit =
    values.detailType !== IMPLEMENTATION_UNIT_DETAIL_TYPE;
  const shouldSelectScreen =
    values.detailType === INPUT_DETAIL_TYPE ||
    values.detailType === DISPLAY_DETAIL_TYPE;
  const shouldShowUnitSelect = shouldSelectUnit && !fixedParentUnitId;
  const shouldShowScreenSelect = shouldSelectScreen && !fixedParentScreenId;

  const getContextFields = (
    detailType: string,
    currentFields: Record<string, string>,
  ) => {
    const contextFields: Record<string, string> = {};

    if (detailType === IMPLEMENTATION_UNIT_DETAIL_TYPE) {
      return contextFields;
    }

    const parentUnitId =
      fixedParentUnitId || currentFields[PARENT_UNIT_FIELD] || "";

    if (parentUnitId) {
      contextFields[PARENT_UNIT_FIELD] = parentUnitId;
    }

    if (
      detailType !== INPUT_DETAIL_TYPE &&
      detailType !== DISPLAY_DETAIL_TYPE
    ) {
      return contextFields;
    }

    const parentScreenId =
      fixedParentScreenId || currentFields[PARENT_SCREEN_FIELD] || "";

    if (parentScreenId) {
      contextFields[PARENT_SCREEN_FIELD] = parentScreenId;
    }

    return contextFields;
  };

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();

    const nextErrors: RequirementDetailFormErrors = {};
    const hasFieldValue = detailDefinition.fields.some((field) =>
      values.fields[field.key]?.trim(),
    );

    if (!values.detailType.trim()) {
      nextErrors.detailType = "種類を選択してください。";
    }

    if (!hasFieldValue && !values.rawJson.trim()) {
      nextErrors.fields = "少なくとも1つの項目を入力してください。";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    await onSubmit(values)
      .then(() => {
        if (resetOnSuccess) {
          setValues(
            getDefaultRequirementDetailFormValues(
              selectableDefinitions[0].value,
            ),
          );
        }
        onSuccess?.();
      })
      .catch(() => undefined);
  };

  const updateFieldValue = (fieldKey: string, value: string) => {
    setValues((current) => ({
      ...current,
      fields: {
        ...current.fields,
        [fieldKey]: value,
      },
      rawJson: "",
    }));
    setErrors((current) => ({
      ...current,
      fields: undefined,
      [`field.${fieldKey}`]: undefined,
    }));
  };

  return (
    <form className="max-w-3xl" onSubmit={handleSubmit}>
      <FieldGroup className="gap-3">
        <Field data-invalid={errors.detailType ? true : undefined}>
          <FieldLabel>種類</FieldLabel>
          <Select
            value={values.detailType}
            onValueChange={(detailType) => {
              setValues((current) => ({
                detailType,
                sourceDetailType: undefined,
                fields: getContextFields(detailType, current.fields),
                rawJson: "",
              }));
              setErrors({});
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="種類を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {selectableDefinitions.map((definition) => (
                  <SelectItem key={definition.value} value={definition.value}>
                    {definition.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {detailDefinition.description}
          </p>
          {errors.detailType ? (
            <FieldError>{errors.detailType}</FieldError>
          ) : null}
        </Field>

        {shouldShowUnitSelect ? (
          <Field>
            <FieldLabel>紐づけ先の実現単位</FieldLabel>
            <Select
              value={values.fields[PARENT_UNIT_FIELD] || "none"}
              onValueChange={(unitId) => {
                setValues((current) => ({
                  ...current,
                  fields: {
                    ...current.fields,
                    [PARENT_UNIT_FIELD]: unitId === "none" ? "" : unitId,
                    [PARENT_SCREEN_FIELD]: fixedParentScreenId,
                  },
                  rawJson: "",
                }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="実現単位を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">
                    未整理の実現内容として追加
                  </SelectItem>
                  {unitOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        ) : null}

        {shouldShowScreenSelect ? (
          <Field>
            <FieldLabel>紐づけ先の画面・操作</FieldLabel>
            <Select
              value={values.fields[PARENT_SCREEN_FIELD] || "none"}
              disabled={
                !values.fields[PARENT_UNIT_FIELD] || !screenOptions.length
              }
              onValueChange={(screenId) => {
                setValues((current) => ({
                  ...current,
                  fields: {
                    ...current.fields,
                    [PARENT_SCREEN_FIELD]: screenId === "none" ? "" : screenId,
                  },
                  rawJson: "",
                }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="画面・操作を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">実現単位の直下に追加</SelectItem>
                  {screenOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              画面に紐づく項目だけ選択してください。画面が関係ない場合は実現単位の直下に置けます。
            </p>
          </Field>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          {detailDefinition.fields.map((field) => {
            const value = values.fields[field.key] ?? "";
            const fieldError = errors[`field.${field.key}`];

            return (
              <Field
                key={field.key}
                data-invalid={fieldError ? true : undefined}
                className={field.multiline ? "md:col-span-2" : undefined}
              >
                <FieldLabel>{field.label}</FieldLabel>
                {field.multiline ? (
                  <Textarea
                    value={value}
                    placeholder={field.placeholder}
                    className="min-h-20"
                    onChange={(event) =>
                      updateFieldValue(field.key, event.target.value)
                    }
                    aria-invalid={Boolean(fieldError)}
                  />
                ) : (
                  <Input
                    value={value}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      updateFieldValue(field.key, event.target.value)
                    }
                    aria-invalid={Boolean(fieldError)}
                  />
                )}
                {fieldError ? <FieldError>{fieldError}</FieldError> : null}
              </Field>
            );
          })}
        </div>

        {errors.fields ? <FieldError>{errors.fields}</FieldError> : null}
        <FormApiError error={error} />
        <FormSubmitButton isPending={isPending}>{submitLabel}</FormSubmitButton>
      </FieldGroup>
    </form>
  );
}

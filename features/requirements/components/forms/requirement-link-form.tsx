"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
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

import { REQUIREMENT_LINK_TYPE_OPTIONS } from "../../constants/requirement-options";
import { requirementLinkSchema } from "../../schemas/requirement-schema";
import type {
  RequirementLinkFormErrors,
  RequirementLinkFormValues,
} from "../../types/requirement-link-form";

type RequirementLinkFormProps = {
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: RequirementLinkFormValues) => Promise<unknown>;
};

const initialValues: RequirementLinkFormValues = {
  linkedType: "api",
  linkedId: "",
};

export function RequirementLinkForm({
  isPending,
  error,
  onSubmit,
}: RequirementLinkFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RequirementLinkFormErrors>({});

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) => {
    event.preventDefault();

    const result = requirementLinkSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        linkedType: fieldErrors.linkedType?.[0],
        linkedId: fieldErrors.linkedId?.[0],
      });
      return;
    }

    setErrors({});
    await onSubmit(result.data)
      .then(() => setValues(initialValues))
      .catch(() => undefined);
  };

  const updateValue = <TKey extends keyof RequirementLinkFormValues>(
    field: TKey,
    value: RequirementLinkFormValues[TKey]
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
            <FieldLabel>リンク先ID</FieldLabel>
            <Input
              value={values.linkedId}
              onChange={(event) => updateValue("linkedId", event.target.value)}
              placeholder="例: POST /auth/login"
              aria-invalid={Boolean(errors.linkedId)}
            />
            {errors.linkedId ? <FieldError>{errors.linkedId}</FieldError> : null}
          </Field>
        </div>
        {error ? <FieldError>{error.message}</FieldError> : null}
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            関連成果物追加
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

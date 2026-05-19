"use client";

import type { FormEvent } from "react";
import { useId, useState } from "react";

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

import { PROJECT_STATUS_OPTIONS } from "../constants/project-form";
import { projectSchema } from "../schemas/project-schema";
import type { ProjectFormErrors, ProjectFormValues } from "../types/project-form";

type ProjectFormProps = {
  mode: "create" | "update";
  initialValues: ProjectFormValues;
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: ProjectFormValues) => Promise<unknown>;
};

export function ProjectForm({
  mode,
  initialValues,
  isPending,
  error,
  onSubmit,
}: ProjectFormProps) {
  const projectCodeId = useId();
  const nameId = useId();
  const descriptionId = useId();
  const startDateId = useId();
  const endDateId = useId();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ProjectFormErrors>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = projectSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        projectCode: fieldErrors.projectCode?.[0],
        name: fieldErrors.name?.[0],
        status: fieldErrors.status?.[0],
      });
      return;
    }

    setErrors({});
    await onSubmit(result.data).catch(() => undefined);
  };

  const updateValue = <TKey extends keyof ProjectFormValues>(
    field: TKey,
    value: ProjectFormValues[TKey]
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <form className="max-w-2xl" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field data-invalid={errors.projectCode ? true : undefined}>
          <FieldLabel htmlFor={projectCodeId}>プロジェクトコード</FieldLabel>
          <Input
            id={projectCodeId}
            value={values.projectCode}
            onChange={(event) =>
              updateValue("projectCode", event.target.value)
            }
            aria-invalid={Boolean(errors.projectCode)}
          />
          {errors.projectCode ? (
            <FieldError>{errors.projectCode}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor={nameId}>プロジェクト名</FieldLabel>
          <Input
            id={nameId}
            value={values.name}
            onChange={(event) => updateValue("name", event.target.value)}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name ? <FieldError>{errors.name}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel htmlFor={descriptionId}>説明</FieldLabel>
          <Input
            id={descriptionId}
            value={values.description}
            onChange={(event) => updateValue("description", event.target.value)}
          />
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
                {PROJECT_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {errors.status ? <FieldError>{errors.status}</FieldError> : null}
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={startDateId}>開始日</FieldLabel>
            <Input
              id={startDateId}
              type="date"
              value={values.startDate}
              onChange={(event) => updateValue("startDate", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={endDateId}>終了日</FieldLabel>
            <Input
              id={endDateId}
              type="date"
              value={values.endDate}
              onChange={(event) => updateValue("endDate", event.target.value)}
            />
          </Field>
        </div>

        {error ? <FieldError>{error.message}</FieldError> : null}

        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            {mode === "create" ? "登録" : "更新"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

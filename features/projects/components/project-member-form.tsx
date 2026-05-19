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

import { PROJECT_ROLE_OPTIONS } from "../constants/project-roles";
import { projectMemberSchema } from "../schemas/project-schema";
import type {
  ProjectMemberFormErrors,
  ProjectMemberFormValues,
} from "../types/project-member-form";

type ProjectMemberFormProps = {
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: ProjectMemberFormValues) => Promise<unknown>;
};

const initialValues: ProjectMemberFormValues = {
  userId: "",
  roleKey: "member",
};

export function ProjectMemberForm({
  isPending,
  error,
  onSubmit,
}: ProjectMemberFormProps) {
  const userIdInputId = useId();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ProjectMemberFormErrors>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = projectMemberSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        userId: fieldErrors.userId?.[0],
        roleKey: fieldErrors.roleKey?.[0],
      });
      return;
    }

    setErrors({});
    await onSubmit(result.data)
      .then(() => setValues(initialValues))
      .catch(() => undefined);
  };

  const updateValue = <TKey extends keyof ProjectMemberFormValues>(
    field: TKey,
    value: ProjectMemberFormValues[TKey]
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <form className="max-w-2xl" onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <Field data-invalid={errors.userId ? true : undefined}>
            <FieldLabel htmlFor={userIdInputId}>ユーザーID</FieldLabel>
            <Input
              id={userIdInputId}
              inputMode="numeric"
              value={values.userId}
              onChange={(event) => updateValue("userId", event.target.value)}
              aria-invalid={Boolean(errors.userId)}
            />
            {errors.userId ? <FieldError>{errors.userId}</FieldError> : null}
          </Field>

          <Field data-invalid={errors.roleKey ? true : undefined}>
            <FieldLabel>権限</FieldLabel>
            <Select
              value={values.roleKey}
              onValueChange={(value) => updateValue("roleKey", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="権限を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {PROJECT_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.roleKey ? <FieldError>{errors.roleKey}</FieldError> : null}
          </Field>
        </div>

        {error ? <FieldError>{error.message}</FieldError> : null}

        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            メンバー追加
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

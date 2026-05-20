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
import { Spinner } from "@/components/ui/spinner";
import { useUpdateCurrentUser } from "@/features/auth/hooks/use-update-current-user";
import { getConflictFields } from "@/lib/api/conflict";
import type { CurrentUserRead } from "@/lib/api/generated/model";

import { getAccountProfileFormValues } from "../../constants/account-form";
import { accountProfileSchema } from "../../schemas/account-schema";
import type {
  AccountProfileFormErrors,
  AccountProfileFormValues,
} from "../../types/account-form";

type AccountProfileFormProps = {
  user: CurrentUserRead;
};

export function AccountProfileForm({ user }: AccountProfileFormProps) {
  const nameId = useId();
  const passwordId = useId();
  const {
    updateCurrentUser,
    conflictCurrent,
    resetConflict,
    isPending,
    error,
  } = useUpdateCurrentUser();
  const [values, setValues] = useState<AccountProfileFormValues>(
    getAccountProfileFormValues(user)
  );
  const [errors, setErrors] = useState<AccountProfileFormErrors>({});
  const conflictValues = conflictCurrent
    ? getAccountProfileFormValues(conflictCurrent)
    : null;
  const conflictFields = conflictValues
    ? getConflictFields({
        original: getAccountProfileFormValues(user) as Record<string, unknown>,
        local: values as Record<string, unknown>,
        current: conflictValues as Record<string, unknown>,
      })
    : [];

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) => {
    event.preventDefault();

    const result = accountProfileSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        name: fieldErrors.name?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }

    setErrors({});
    await updateCurrentUser({
      version: user.version,
      name: result.data.name,
      password: result.data.password || null,
    }).catch(() => undefined);
  };

  const updateValue = <TKey extends keyof AccountProfileFormValues>(
    field: TKey,
    value: AccountProfileFormValues[TKey]
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <form className="max-w-2xl" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor={nameId}>名前</FieldLabel>
          <Input
            id={nameId}
            value={values.name}
            onChange={(event) => updateValue("name", event.target.value)}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name ? <FieldError>{errors.name}</FieldError> : null}
        </Field>

        <Field data-invalid={errors.password ? true : undefined}>
          <FieldLabel htmlFor={passwordId}>パスワード</FieldLabel>
          <Input
            id={passwordId}
            type="password"
            value={values.password}
            placeholder="変更する場合のみ入力"
            onChange={(event) => updateValue("password", event.target.value)}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password ? <FieldError>{errors.password}</FieldError> : null}
        </Field>

        {error ? <FieldError>{error.message}</FieldError> : null}

        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            更新
          </Button>
        </Field>
      </FieldGroup>

      {conflictValues ? (
        <ConflictResolutionDialog
          open
          fields={conflictFields}
          localValues={values}
          currentValues={conflictValues}
          fieldLabels={ACCOUNT_PROFILE_CONFLICT_FIELD_LABELS}
          isPending={isPending}
          onOpenChange={(open) => !open && resetConflict()}
          onResolve={async (resolvedValues) => {
            if (!conflictCurrent) {
              return;
            }

            setValues(resolvedValues);
            await updateCurrentUser({
              version: conflictCurrent.version,
              name: resolvedValues.name,
              password: resolvedValues.password || null,
            });
          }}
        />
      ) : null}
    </form>
  );
}

const ACCOUNT_PROFILE_CONFLICT_FIELD_LABELS = {
  name: "名前",
  password: "パスワード",
} satisfies Partial<Record<keyof AccountProfileFormValues, string>>;

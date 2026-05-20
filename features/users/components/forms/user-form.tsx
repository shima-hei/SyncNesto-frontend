"use client";

import { useId, useState } from "react";

import { ConflictResolutionDialog } from "@/components/shared/conflict-resolution-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getConflictFields } from "@/lib/api/conflict";

import { userCreateSchema, userUpdateSchema } from "../../schemas/user-schema";
import type { UserFormErrors, UserFormValues } from "../../types/user-form";

type UserFormProps = {
  mode: "create" | "update";
  initialValues: UserFormValues;
  isPending: boolean;
  error?: Error | null;
  conflictValues?: UserFormValues | null;
  onCloseConflict?: () => void;
  onResolveConflict?: (values: UserFormValues) => Promise<unknown>;
  onSubmit: (values: UserFormValues) => Promise<unknown>;
};

export function UserForm({
  mode,
  initialValues,
  isPending,
  error,
  conflictValues,
  onCloseConflict,
  onResolveConflict,
  onSubmit,
}: UserFormProps) {
  const emailId = useId();
  const nameId = useId();
  const passwordId = useId();
  const departmentId = useId();
  const positionId = useId();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<UserFormErrors>({});
  const schema = mode === "create" ? userCreateSchema : userUpdateSchema;

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) => {
    event.preventDefault();

    const result = schema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        email: fieldErrors.email?.[0],
        name: fieldErrors.name?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }

    setErrors({});
    await onSubmit(result.data).catch(() => undefined);
  };

  const updateValue = <TKey extends keyof UserFormValues>(
    field: TKey,
    value: UserFormValues[TKey]
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
      <form className="max-w-2xl" onSubmit={handleSubmit}>
        <FieldGroup>
          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor={emailId}>メールアドレス</FieldLabel>
            <Input
              id={emailId}
              type="email"
              value={values.email}
              onChange={(event) => updateValue("email", event.target.value)}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email ? <FieldError>{errors.email}</FieldError> : null}
          </Field>

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
            placeholder={mode === "update" ? "変更する場合のみ入力" : undefined}
            onChange={(event) => updateValue("password", event.target.value)}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password ? <FieldError>{errors.password}</FieldError> : null}
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={departmentId}>部署</FieldLabel>
            <Input
              id={departmentId}
              value={values.department}
              onChange={(event) =>
                updateValue("department", event.target.value)
              }
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={positionId}>役職</FieldLabel>
            <Input
              id={positionId}
              value={values.position}
              onChange={(event) => updateValue("position", event.target.value)}
            />
          </Field>
        </div>

        <FieldSet>
          <FieldLabel>状態・権限</FieldLabel>
          <Field orientation="horizontal">
            <Checkbox
              id="is-active"
              checked={values.isActive}
              onCheckedChange={(checked) =>
                updateValue("isActive", checked === true)
              }
            />
            <FieldContent>
              <FieldTitle>有効ユーザー</FieldTitle>
              <FieldDescription>
                無効にするとログインや操作対象から除外されます。
              </FieldDescription>
            </FieldContent>
          </Field>
          <Field orientation="horizontal">
            <Checkbox
              id="is-system-admin"
              checked={values.isSystemAdmin}
              onCheckedChange={(checked) =>
                updateValue("isSystemAdmin", checked === true)
              }
            />
            <FieldContent>
              <FieldTitle>システム管理者</FieldTitle>
              <FieldDescription>
                ユーザー管理や全プロジェクト管理を許可します。
              </FieldDescription>
            </FieldContent>
          </Field>
        </FieldSet>

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
          fieldLabels={USER_CONFLICT_FIELD_LABELS}
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

const USER_CONFLICT_FIELD_LABELS = {
  email: "メールアドレス",
  name: "名前",
  password: "パスワード",
  department: "部署",
  position: "役職",
  isActive: "有効ユーザー",
  isSystemAdmin: "システム管理者",
} satisfies Partial<Record<keyof UserFormValues, string>>;

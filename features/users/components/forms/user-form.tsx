"use client";

import { useId, useState } from "react";

import { ConflictResolutionDialog } from "@/components/shared/dialogs/conflict-resolution-dialog";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { FormSubmitButton } from "@/components/shared/forms/form-submit-button";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_TYPE_KEYS } from "@/features/auth/constants/roles";
import { getConflictFields } from "@/lib/api/conflict";

import {
  USER_CONFLICT_FIELD_LABELS,
  USER_CONFLICT_VALUE_FORMATTERS,
} from "../../constants/user-conflict-fields";
import { USER_TYPE_OPTIONS } from "../../constants/user-types";
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
  const isGuest = values.userType === USER_TYPE_KEYS.guest;

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();

    const result = schema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        email: fieldErrors.email?.[0],
        name: fieldErrors.name?.[0],
        password: fieldErrors.password?.[0],
        userType: fieldErrors.userType?.[0],
        isSystemAdmin: fieldErrors.isSystemAdmin?.[0],
      });
      return;
    }

    setErrors({});
    await onSubmit(result.data).catch(() => undefined);
  };

  const updateValue = <TKey extends keyof UserFormValues>(
    field: TKey,
    value: UserFormValues[TKey],
  ) => {
    setValues((current) => {
      if (field === "userType" && value === USER_TYPE_KEYS.guest) {
        return { ...current, userType: value, isSystemAdmin: false };
      }

      return { ...current, [field]: value };
    });
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
              placeholder={
                mode === "update" ? "変更する場合のみ入力" : undefined
              }
              onChange={(event) => updateValue("password", event.target.value)}
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password ? (
              <FieldError>{errors.password}</FieldError>
            ) : null}
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
                onChange={(event) =>
                  updateValue("position", event.target.value)
                }
              />
            </Field>
          </div>

          <FieldSet>
            <FieldLabel>区分・状態・権限</FieldLabel>
            <Field data-invalid={errors.userType ? true : undefined}>
              <FieldLabel>ユーザー区分</FieldLabel>
              <Select
                value={values.userType}
                onValueChange={(value) =>
                  updateValue("userType", value as UserFormValues["userType"])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="ユーザー区分を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {USER_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.userType ? (
                <FieldError>{errors.userType}</FieldError>
              ) : null}
            </Field>
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
                disabled={isGuest}
                onCheckedChange={(checked) =>
                  updateValue("isSystemAdmin", checked === true)
                }
              />
              <FieldContent>
                <FieldTitle>システム管理者</FieldTitle>
                <FieldDescription>
                  {isGuest
                    ? "ゲストには付与できません。"
                    : "ユーザー管理や全プロジェクト管理を許可します。"}
                </FieldDescription>
              </FieldContent>
            </Field>
            {errors.isSystemAdmin ? (
              <FieldError>{errors.isSystemAdmin}</FieldError>
            ) : null}
          </FieldSet>

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
          fieldLabels={USER_CONFLICT_FIELD_LABELS}
          valueFormatters={USER_CONFLICT_VALUE_FORMATTERS}
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

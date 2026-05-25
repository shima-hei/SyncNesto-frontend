"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { UserSelect } from "@/components/shared/forms/user-select";
import { useUsers } from "@/features/users/hooks/use-users";
import type { UserListItem } from "@/lib/api/generated/model";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";

import { PROJECT_ROLE_OPTIONS } from "../../constants/project-roles";
import { projectMemberSchema } from "../../schemas/project-schema";
import type {
  ProjectMemberFormErrors,
  ProjectMemberFormValues,
} from "../../types/project-member-form";

type ProjectMemberFormProps = {
  excludedUserIds: readonly number[];
  isPending: boolean;
  error?: Error | null;
  onSubmit: (values: ProjectMemberFormValues) => Promise<unknown>;
};

const initialValues: ProjectMemberFormValues = {
  userId: null,
  roleKey: "member",
};

export function ProjectMemberForm({
  excludedUserIds,
  isPending,
  error,
  onSubmit,
}: ProjectMemberFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ProjectMemberFormErrors>({});
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [userSelectOpen, setUserSelectOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const { users, isLoading: isUsersLoading } = useUsers({
    page: 1,
    page_size: 20,
    q: userSearch.trim() || undefined,
    is_active: true,
  });

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) => {
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
      .then(() => {
        setValues(initialValues);
        setSelectedUser(null);
        setUserSearch("");
      })
      .catch(() => undefined);
  };

  const updateValue = <TKey extends keyof ProjectMemberFormValues>(
    field: TKey,
    value: ProjectMemberFormValues[TKey]
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleUserSelect = (user: UserListItem) => {
    setSelectedUser(user);
    updateValue("userId", user.id);
    setUserSelectOpen(false);
  };

  return (
    <form className="max-w-2xl" onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <Field data-invalid={errors.userId ? true : undefined}>
            <FieldLabel>ユーザー</FieldLabel>
            <UserSelect
              users={users}
              selectedUser={selectedUser}
              open={userSelectOpen}
              search={userSearch}
              isLoading={isUsersLoading}
              excludedUserIds={excludedUserIds}
              onOpenChange={setUserSelectOpen}
              onSearchChange={setUserSearch}
              onSelect={handleUserSelect}
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

        {error ? <FieldError>{getApiErrorMessage(error)}</FieldError> : null}

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

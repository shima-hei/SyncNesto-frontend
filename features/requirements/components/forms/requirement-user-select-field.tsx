"use client";

import { useState } from "react";

import {
  type SelectableUser,
  UserSelect,
} from "@/components/shared/forms/user-select";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { useProjectMemberUsers } from "@/features/projects";
import type { UserSummary } from "@/lib/api/generated/model";

type RequirementUserSelectFieldProps = {
  projectId: number;
  label: string;
  value: string;
  error?: string;
  initialUser?: UserSummary | null;
  onChange: (value: string) => void;
};

export function RequirementUserSelectField({
  projectId,
  label,
  value,
  error,
  initialUser,
  onChange,
}: RequirementUserSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<SelectableUser | null>(null);
  const { users, isLoading } = useProjectMemberUsers(projectId, {
    q: search.trim() || undefined,
    limit: 20,
  });
  const selectedValue = getSelectedValue({
    value,
    users,
    selectedUser,
    initialUser,
  });

  const handleSelect = (user: SelectableUser) => {
    setSelectedUser(user);
    onChange(String(user.id));
    setOpen(false);
  };

  const handleClear = () => {
    setSelectedUser(null);
    onChange("");
  };

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex min-w-0 gap-2">
        <div className="min-w-0 flex-1">
          <UserSelect
            users={users}
            selectedUser={selectedValue}
            open={open}
            search={search}
            isLoading={isLoading}
            placeholder={`${label}を選択`}
            onOpenChange={setOpen}
            onSearchChange={setSearch}
            onSelect={handleSelect}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={!value}
          onClick={handleClear}
        >
          解除
        </Button>
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

const getFallbackSelectedUser = (value: string): SelectableUser | null => {
  const userId = Number(value);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return {
    id: userId,
    name: `ユーザーID: ${userId}`,
    email: "ユーザー情報未取得",
    user_type: "internal",
    is_active: true,
  };
};

const getSelectedValue = ({
  value,
  users,
  selectedUser,
  initialUser,
}: {
  value: string;
  users: SelectableUser[];
  selectedUser: SelectableUser | null;
  initialUser?: UserSummary | null;
}) => {
  if (!value) {
    return null;
  }

  if (selectedUser?.id === Number(value)) {
    return selectedUser;
  }

  return (
    users.find((user) => String(user.id) === value) ??
    (initialUser && String(initialUser.id) === value ? initialUser : null) ??
    getFallbackSelectedUser(value)
  );
};

"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";

import {
  type SelectableUser,
  UserSelect,
} from "@/components/shared/forms/user-select";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { useProjectMemberUsers } from "@/features/projects";

type RequirementOwnerFilterProps = {
  projectId: number;
  value: number | null;
  label?: string;
  onChange: (value: number | null) => void;
};

export function RequirementOwnerFilter({
  projectId,
  value,
  label,
  onChange,
}: RequirementOwnerFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<SelectableUser | null>(null);
  const { users, isLoading } = useProjectMemberUsers(projectId, {
    q: search.trim() || undefined,
    limit: 20,
  });
  const selectedValue =
    selectedUser?.id === value
      ? selectedUser
      : users.find((user) => user.id === value) ?? null;

  const handleSelect = (user: SelectableUser) => {
    setSelectedUser(user);
    onChange(user.id);
    setOpen(false);
  };

  const handleClear = () => {
    setSelectedUser(null);
    setSearch("");
    onChange(null);
  };

  return (
    <Field>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <div className="flex min-w-0 gap-2">
        <div className="min-w-0 flex-1">
          <UserSelect
            users={users}
            selectedUser={selectedValue}
            open={open}
            search={search}
            isLoading={isLoading}
            placeholder="担当者を選択"
            onOpenChange={setOpen}
            onSearchChange={setSearch}
            onSelect={handleSelect}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!value}
          onClick={handleClear}
        >
          <XIcon data-icon="inline-start" />
          解除
        </Button>
      </div>
    </Field>
  );
}

"use client";

import { ChevronsUpDownIcon } from "lucide-react";

import { UserAvatar } from "@/components/shared/display/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getUserTypeLabel } from "@/features/users/constants/user-types";
import type { UserListItem } from "@/lib/api/generated/model";
import { cn } from "@/lib/utils";

export type SelectableUser = Pick<
  UserListItem,
  "id" | "name" | "email" | "avatar_url" | "user_type" | "is_active"
>;

type UserSelectProps = {
  triggerId?: string;
  users: SelectableUser[];
  selectedUser: SelectableUser | null;
  open: boolean;
  search: string;
  isLoading: boolean;
  excludedUserIds?: readonly number[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  disabled?: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onSelect: (user: SelectableUser) => void;
};

export function UserSelect({
  triggerId,
  users,
  selectedUser,
  open,
  search,
  isLoading,
  excludedUserIds = [],
  placeholder = "ユーザーを選択",
  searchPlaceholder = "名前またはメールで検索",
  emptyMessage = "候補ユーザーがありません。",
  loadingMessage = "検索中です。",
  disabled = false,
  onOpenChange,
  onSearchChange,
  onSelect,
}: UserSelectProps) {
  const selectableUsers = users.filter(
    (user) => !excludedUserIds.includes(user.id),
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={triggerId}
          type="button"
          variant="outline"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between",
            !selectedUser && "text-muted-foreground",
          )}
        >
          {selectedUser ? (
            <span className="flex min-w-0 items-center gap-2">
              <UserAvatar
                name={selectedUser.name}
                src={selectedUser.avatar_url}
                size="sm"
              />
              <span className="truncate">{selectedUser.name}</span>
              <Badge variant="outline">
                {getUserTypeLabel(selectedUser.user_type)}
              </Badge>
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDownIcon data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? loadingMessage : emptyMessage}
            </CommandEmpty>
            <CommandGroup>
              {selectableUsers.map((user) => {
                const isSelected = selectedUser?.id === user.id;

                return (
                  <CommandItem
                    key={user.id}
                    value={`${user.name} ${user.email}`}
                    data-checked={isSelected}
                    onSelect={() => onSelect(user)}
                  >
                    <UserAvatar
                      name={user.name}
                      src={user.avatar_url}
                      size="sm"
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">
                          {user.name}
                        </span>
                        <Badge variant="outline">
                          {getUserTypeLabel(user.user_type)}
                        </Badge>
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

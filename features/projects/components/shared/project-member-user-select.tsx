"use client";

import { ChevronsUpDownIcon } from "lucide-react";

import { UserAvatar } from "@/components/shared/user-avatar";
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
import type { UserListItem } from "@/lib/api/generated/model";
import { cn } from "@/lib/utils";

type ProjectMemberUserSelectProps = {
  users: UserListItem[];
  selectedUser: UserListItem | null;
  open: boolean;
  search: string;
  isLoading: boolean;
  excludedUserIds: readonly number[];
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onSelect: (user: UserListItem) => void;
};

export function ProjectMemberUserSelect({
  users,
  selectedUser,
  open,
  search,
  isLoading,
  excludedUserIds,
  onOpenChange,
  onSearchChange,
  onSelect,
}: ProjectMemberUserSelectProps) {
  const selectableUsers = users.filter(
    (user) => !excludedUserIds.includes(user.id)
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedUser && "text-muted-foreground"
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
            </span>
          ) : (
            "ユーザーを選択"
          )}
          <ChevronsUpDownIcon data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={onSearchChange}
            placeholder="名前またはメールで検索"
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "検索中です。" : "候補ユーザーがありません。"}
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
                      <span className="truncate font-medium">{user.name}</span>
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

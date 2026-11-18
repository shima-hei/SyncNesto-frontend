"use client";

import { useState } from "react";
import { UserRoundIcon } from "lucide-react";
import { UserAvatar } from "@/components/shared/display/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useProjectMemberUsers } from "@/features/projects";
import type { TaskRead } from "@/lib/api/generated/model";
import type { TaskPlanningController } from "../../hooks/use-task-planning";

function Choices({
  projectId,
  clear,
  choose,
}: {
  projectId: number;
  clear: boolean;
  choose: (value: string) => void;
}) {
  const [search, setSearch] = useState("");
  const { users, isLoading, error } = useProjectMemberUsers(projectId, {
    q: search.trim() || undefined,
    limit: 30,
  });
  return (
    <Command shouldFilter={false}>
      <CommandInput
        aria-label="担当者を検索"
        placeholder="担当者を検索"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          {error
            ? "担当者を取得できませんでした。"
            : isLoading
              ? "取得中…"
              : "候補がありません。"}
        </CommandEmpty>
        <CommandGroup>
          {clear && (
            <CommandItem value="clear" onSelect={() => choose("")}>
              担当を解除
            </CommandItem>
          )}
          {users.map((user) => (
            <CommandItem
              key={user.id}
              value={String(user.id)}
              onSelect={() => choose(String(user.id))}
            >
              <UserAvatar size="sm" name={user.name} src={user.avatar_url} />
              {user.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function PlanningAssigneeCell({
  task,
  planning,
  editable,
  name,
  avatarUrl,
  compact = false,
}: {
  task: TaskRead;
  planning: TaskPlanningController;
  editable: boolean;
  name: string;
  avatarUrl?: string | null;
  compact?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<TaskRead | null>(null);
  const [pending, setPending] = useState(false);
  const assigned =
    planning.rows[task.id]?.values.assigneeId ?? task.assignee_id;
  const label = assigned ? name : "担当なし";
  const content = (
    <>
      {assigned ? (
        <UserAvatar size="sm" name={label} src={avatarUrl} />
      ) : (
        <UserRoundIcon className="size-4 shrink-0 text-muted-foreground" />
      )}
      {!compact && <span className="truncate">{label}</span>}
    </>
  );
  if (!editable)
    return (
      <span title={label} className="inline-flex min-w-0 items-center gap-1">
        {content}
      </span>
    );
  return (
    <Popover
      open={Boolean(snapshot)}
      onOpenChange={(open) => setSnapshot(open ? task : null)}
    >
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          data-cell="assignee_id"
          disabled={
            pending ||
            Boolean(planning.pendingDraft) ||
            ["pending", "unknown", "conflict"].includes(
              planning.rows[task.id]?.status ?? "",
            )
          }
          aria-busy={pending}
          data-effort-pending={pending}
          title={label}
          aria-label={task.task_code + "の担当者 " + label}
          className={
            compact ? "size-8 p-0" : "h-7 max-w-full justify-start gap-1 px-1"
          }
        >
          {content}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-60 p-0"
        aria-label="担当者を選択"
      >
        {snapshot && (
          <Choices
            projectId={task.project_id}
            clear={Boolean(assigned)}
            choose={async (value) => {
              setSnapshot(null);
              if (value === String(assigned ?? "")) return;
              setPending(true);
              try {
                await planning.commit(snapshot, { assigneeId: value });
              } finally {
                setPending(false);
              }
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

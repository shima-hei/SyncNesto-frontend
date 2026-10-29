"use client";

import { useState } from "react";
import { ChevronsUpDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TaskRead } from "@/lib/api/generated/model";
import { cn } from "@/lib/utils";

import { useTasks } from "../../hooks/use-tasks";
import { useTask } from "../../hooks/use-task";
import { readTaskId, resolveTaskReference } from "../../lib/task-list-scope";

type TaskParentSelectFieldProps = {
  projectId: number;
  value: string;
  label?: string;
  placeholder?: string;
  error?: string;
  excludedTaskId?: number;
  excludedTaskIds?: number[];
  onChange: (value: string) => void;
};

export function TaskParentSelectField({
  projectId,
  value,
  label = "親タスク",
  placeholder,
  error,
  excludedTaskId,
  excludedTaskIds = [],
  onChange,
}: TaskParentSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<TaskRead | null>(null);
  const selectedTaskId = readTaskId(value);
  const {
    task: fetchedTask,
    error: selectedTaskError,
    isLoading: isSelectedLoading,
  } = useTask(selectedTaskId);
  const {
    tasks,
    isLoading,
    isPlaceholderData,
    error: searchError,
  } = useTasks(projectId, {
    page: 1,
    page_size: 20,
    q: search.trim() || undefined,
  });
  const excludedIds = new Set(
    [excludedTaskId, ...excludedTaskIds].filter(
      (id): id is number => typeof id === "number",
    ),
  );
  const selectableTasks =
    isPlaceholderData || searchError
      ? []
      : tasks.filter(
          (task) => task.project_id === projectId && !excludedIds.has(task.id),
        );
  const selectedValue = selectedTaskError
    ? null
    : resolveTaskReference(projectId, selectedTaskId, [
        fetchedTask,
        selectedTask,
        ...tasks,
      ]);

  const handleSelect = (task: TaskRead) => {
    setSelectedTask(task);
    onChange(String(task.id));
    setOpen(false);
  };

  const handleClear = () => {
    setSelectedTask(null);
    onChange("");
  };

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex min-w-0 gap-2">
        <div className="min-w-0 flex-1">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                aria-expanded={open}
                className={cn(
                  "h-auto min-h-9 w-full justify-between",
                  !selectedValue && "text-muted-foreground",
                )}
              >
                {selectedValue ? (
                  <span className="flex min-w-0 flex-col text-left whitespace-normal">
                    <span className="break-words">{selectedValue.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {selectedValue.task_code}
                    </span>
                  </span>
                ) : value ? (
                  <span className="flex min-w-0 flex-col text-left whitespace-normal">
                    <span>
                      {isSelectedLoading
                        ? "親を読み込んでいます"
                        : "親を確認できません"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ID: {value}
                    </span>
                  </span>
                ) : (
                  (placeholder ?? `${label}を選択`)
                )}
                <ChevronsUpDownIcon data-icon="inline-end" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
              <Command shouldFilter={false}>
                <CommandInput
                  value={search}
                  onValueChange={setSearch}
                  placeholder="コード・名称・説明で検索"
                />
                <CommandList>
                  <CommandEmpty>
                    {isLoading || isPlaceholderData
                      ? "検索中です。"
                      : searchError
                        ? "候補タスクを取得できません。"
                        : "候補タスクがありません。"}
                  </CommandEmpty>
                  <CommandGroup>
                    {selectableTasks.map((task) => (
                      <CommandItem
                        key={task.id}
                        value={`${task.task_code} ${task.title}`}
                        data-checked={selectedValue?.id === task.id}
                        onSelect={() => handleSelect(task)}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="break-words font-medium">
                            {task.title}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {task.task_code}
                          </span>
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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

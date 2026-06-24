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

type TaskParentSelectFieldProps = {
  projectId: number;
  value: string;
  label?: string;
  placeholder?: string;
  error?: string;
  excludedTaskId?: number;
  onChange: (value: string) => void;
};

export function TaskParentSelectField({
  projectId,
  value,
  label = "親タスク",
  placeholder,
  error,
  excludedTaskId,
  onChange,
}: TaskParentSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<TaskRead | null>(null);
  const { tasks, isLoading } = useTasks(projectId, {
    page: 1,
    page_size: 20,
    q: search.trim() || undefined,
  });
  const selectableTasks = tasks.filter((task) => task.id !== excludedTaskId);
  const selectedValue = getSelectedValue({
    value,
    tasks: selectableTasks,
    selectedTask,
  });

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
                  "w-full justify-between",
                  !selectedValue && "text-muted-foreground"
                )}
              >
                {selectedValue ? (
                  <span className="min-w-0 truncate">
                    {selectedValue.task_code} {selectedValue.title}
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
                  placeholder="タスクIDまたはタイトルで検索"
                />
                <CommandList>
                  <CommandEmpty>
                    {isLoading ? "検索中です。" : "候補タスクがありません。"}
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
                          <span className="truncate font-medium">
                            {task.task_code}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {task.title}
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

const getFallbackSelectedTask = (value: string): TaskRead | null => {
  const taskId = Number(value);

  if (!Number.isInteger(taskId) || taskId <= 0) {
    return null;
  }

  return {
    id: taskId,
    project_id: 0,
    version: 0,
    task_code: `TASK-${taskId}`,
    title: "タスク情報未取得",
    created_at: "",
    updated_at: "",
  };
};

const getSelectedValue = ({
  value,
  tasks,
  selectedTask,
}: {
  value: string;
  tasks: TaskRead[];
  selectedTask: TaskRead | null;
}) => {
  if (!value) {
    return null;
  }

  if (selectedTask?.id === Number(value)) {
    return selectedTask;
  }

  return tasks.find((task) => String(task.id) === value) ?? getFallbackSelectedTask(value);
};

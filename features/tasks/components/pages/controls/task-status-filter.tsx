"use client";

import { useId } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TASK_STATUS_OPTIONS } from "../../../constants/task-options";
import {
  getSelectedTaskStatuses,
  getTaskStatusFilterLabel,
  type TaskStatusFilter,
} from "../../../lib/task-list-filters";

export function TaskStatusFilterControl({
  value,
  onChange,
}: {
  value: TaskStatusFilter;
  onChange: (filter: TaskStatusFilter) => void;
}) {
  const triggerId = useId();
  const descriptionId = useId();
  const selected = getSelectedTaskStatuses(value, TASK_STATUS_OPTIONS);
  const options = [
    ...TASK_STATUS_OPTIONS,
    ...selected
      .filter(
        (status) =>
          !TASK_STATUS_OPTIONS.some((option) => option.value === status),
      )
      .map((status) => ({ value: status, label: status })),
  ];
  const label = getTaskStatusFilterLabel(value, options);
  const triggerLabel =
    value.kind === "include" && value.values.length > 1
      ? `${value.values.length}件選択`
      : label;
  return (
    <Field>
      <FieldLabel htmlFor={triggerId}>ステータス</FieldLabel>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            id={triggerId}
            type="button"
            variant="outline"
            aria-describedby={descriptionId}
            className="w-full justify-between"
          >
            <span className="truncate">{triggerLabel}</span>
            <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>まとめて選ぶ</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => onChange({ kind: "all" })}>
              すべてのステータス
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onChange({ kind: "exclude", values: ["done"] })}
            >
              完了以外
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                onChange({ kind: "exclude", values: ["cancelled", "done"] })
              }
            >
              完了・中止以外
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              個別に選ぶ（複数可・未選択はすべて）
            </DropdownMenuLabel>
            {options.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selected.includes(option.value)}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(checked) => {
                  const values = checked
                    ? [...selected, option.value]
                    : selected.filter((status) => status !== option.value);
                  onChange(
                    values.length
                      ? { kind: "include", values }
                      : { kind: "all" },
                  );
                }}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <span id={descriptionId} className="sr-only">
        複数選択できます。未選択はすべてのステータスを表示します。現在: {label}
      </span>
    </Field>
  );
}

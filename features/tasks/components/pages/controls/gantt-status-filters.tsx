"use client";

import { StatusBadge } from "@/components/shared/display/status-badge";
import { Button } from "@/components/ui/button";
import { TASK_STATUS_OPTIONS } from "../../../constants/task-options";
import {
  getSelectedTaskStatuses,
  toggleTaskStatusFilter,
  type TaskStatusFilter,
} from "../../../lib/task-list-filters";
import { getTaskStatusTone } from "../../shared/task-badges";

export function GanttStatusFilters({
  filter,
  onChange,
}: {
  filter: TaskStatusFilter;
  onChange: (filter: TaskStatusFilter) => void;
}) {
  const selected = getSelectedTaskStatuses(filter, TASK_STATUS_OPTIONS);
  const options = [
    ...TASK_STATUS_OPTIONS,
    ...selected
      .filter(
        (value) =>
          !TASK_STATUS_OPTIONS.some((option) => option.value === value),
      )
      .map((value) => ({ value, label: value })),
  ];
  const exceptDone =
    filter.kind === "exclude" &&
    filter.values.length === 1 &&
    filter.values[0] === "done";

  return (
    <fieldset
      className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0 px-1"
      aria-describedby="gantt-status-filter-help"
    >
      <legend className="sr-only">ガントのステータスフィルター</legend>
      <span id="gantt-status-filter-help" className="sr-only">
        複数選択できます。未選択のときはすべてのステータスを表示します。
      </span>
      <span
        aria-hidden
        className="mr-1 text-xs font-medium text-muted-foreground"
      >
        ステータス
      </span>
      <Button
        type="button"
        size="sm"
        variant={filter.kind === "all" ? "secondary" : "outline"}
        aria-pressed={filter.kind === "all"}
        onClick={() => onChange({ kind: "all" })}
      >
        すべて
      </Button>
      <Button
        type="button"
        size="sm"
        variant={exceptDone ? "secondary" : "outline"}
        aria-pressed={exceptDone}
        onClick={() => onChange({ kind: "exclude", values: ["done"] })}
      >
        完了以外
      </Button>
      {options.map(({ value, label }) => (
        <label
          key={value}
          className="flex min-h-11 cursor-pointer items-center gap-1 px-0.5"
        >
          <input
            type="checkbox"
            checked={selected.includes(value)}
            className="size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onChange={(event) =>
              onChange(
                toggleTaskStatusFilter(selected, value, event.target.checked),
              )
            }
          />
          <StatusBadge tone={getTaskStatusTone(value)}>{label}</StatusBadge>
        </label>
      ))}
    </fieldset>
  );
}

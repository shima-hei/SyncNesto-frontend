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
      className="flex min-w-0 flex-wrap items-center gap-2 px-1 py-1"
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
      {options.map(({ value, label }) => {
        const pressed = selected.includes(value);
        return (
          <StatusBadge
            key={value}
            tone={getTaskStatusTone(value)}
            asChild
            className="h-8 cursor-pointer px-2.5 hover:brightness-110 aria-pressed:outline-1 aria-pressed:outline-offset-2 aria-pressed:outline-current"
          >
            <button
              type="button"
              aria-pressed={pressed}
              onClick={() =>
                onChange(toggleTaskStatusFilter(selected, value, !pressed))
              }
            >
              {label}
            </button>
          </StatusBadge>
        );
      })}
    </fieldset>
  );
}

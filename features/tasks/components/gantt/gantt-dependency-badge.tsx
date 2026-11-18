"use client";

import { TriangleAlertIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate } from "@/lib/format/date";

import type { GanttDependencyWarning } from "../../lib/gantt-dependency-warnings";

export function GanttDependencyBadge({
  taskLabel,
  warnings,
}: {
  taskLabel: string;
  warnings: readonly GanttDependencyWarning[];
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          asChild
          variant="outline"
          className="cursor-pointer border-amber-300 bg-amber-50 px-1.5 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
        >
          <button
            type="button"
            aria-label={`${taskLabel}の依存警告 ${warnings.length}件`}
          >
            <TriangleAlertIcon aria-hidden />
            <span>依存警告</span>
          </button>
        </Badge>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        aria-label={`${taskLabel}の依存警告`}
        className="w-80 max-w-[calc(100vw-1rem)]"
      >
        <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
          {warnings.map(
            ({ id, predecessor, successor, earliestStart, lagDays }) => (
              <li key={id} className="space-y-1">
                <p className="break-words font-medium">
                  {predecessor.task_code || predecessor.title} →{" "}
                  {successor.task_code || successor.title}
                </p>
                <p className="text-muted-foreground">
                  先行の終了予定 {formatDate(predecessor.due_date)}（ラグ{" "}
                  {lagDays}日）
                </p>
                <p>後続の開始予定 {formatDate(successor.start_date)}</p>
                <p>開始可能日 {formatDate(earliestStart)}</p>
              </li>
            ),
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

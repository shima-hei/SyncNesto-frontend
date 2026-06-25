"use client";

import { CalendarPlusIcon, GripVerticalIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TaskRead } from "@/lib/api/generated/model";

import {
  setUnscheduledTaskDragImage,
  UNSCHEDULED_TASK_DND_TYPE,
} from "../../lib/task-gantt-dnd";
import { TaskFlagBadges, TaskStatusBadge } from "../shared/task-badges";

type UnscheduledTasksPanelProps = {
  open: boolean;
  tasks: TaskRead[];
  isPending: boolean;
  onClose: () => void;
  onOpenDetail: (taskId: number) => void;
  onDragStart: (taskId: number) => void;
  onDragEnd: () => void;
  onAddToday: (task: TaskRead) => Promise<unknown>;
};

export function UnscheduledTasksPanel({
  open,
  tasks,
  isPending,
  onClose,
  onOpenDetail,
  onDragStart,
  onDragEnd,
  onAddToday,
}: UnscheduledTasksPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <aside className="fixed top-0 right-0 bottom-0 z-40 flex w-full max-w-sm flex-col border-l bg-background shadow-lg">
      <div className="flex items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0">
          <h3 className="text-base font-medium">未配置タスク</h3>
          <p className="text-sm text-muted-foreground">
            タスクをガントの日付位置へドラッグします。
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
          <XIcon data-icon="inline-start" />
          <span className="sr-only">閉じる</span>
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {tasks.length ? (
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <UnscheduledTaskDragItem
                key={`${task.id}-${task.version}`}
                task={task}
                isPending={isPending}
                onOpenDetail={onOpenDetail}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onAddToday={onAddToday}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            未配置タスクはありません。
          </p>
        )}
      </div>
    </aside>
  );
}

function UnscheduledTaskDragItem({
  task,
  isPending,
  onOpenDetail,
  onDragStart,
  onDragEnd,
  onAddToday,
}: {
  task: TaskRead;
  isPending: boolean;
  onOpenDetail: (taskId: number) => void;
  onDragStart: (taskId: number) => void;
  onDragEnd: () => void;
  onAddToday: (task: TaskRead) => Promise<unknown>;
}) {
  return (
    <div
      draggable={!isPending}
      className="flex cursor-grab items-start gap-2 rounded-lg border bg-card p-3 active:cursor-grabbing"
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData(UNSCHEDULED_TASK_DND_TYPE, String(task.id));
        setUnscheduledTaskDragImage(event, task);
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
    >
      <GripVerticalIcon className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={() => onOpenDetail(task.id)}
        >
          <span className="block truncate text-sm font-medium">{task.title}</span>
          <span className="text-xs text-muted-foreground">{task.task_code}</span>
        </button>
        <div className="flex flex-wrap gap-1">
          <TaskStatusBadge status={task.status} />
          <TaskFlagBadges isOverdue={task.is_overdue} isBlocked={task.is_blocked} />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => {
            onAddToday(task).catch(() => undefined);
          }}
        >
          <CalendarPlusIcon data-icon="inline-start" />
          今日に追加
        </Button>
      </div>
    </div>
  );
}

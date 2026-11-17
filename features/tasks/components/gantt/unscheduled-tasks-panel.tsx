"use client";

import { useEffect, useRef, useState } from "react";
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
  canUpdate: boolean;
  getPhaseLabel: (task: TaskRead) => string;
  onClose: () => void;
  onOpenDetail: (taskId: number, trigger: HTMLButtonElement) => void;
  onDragStart: (taskId: number) => void;
  onDragEnd: () => void;
  onAddToday: (task: TaskRead) => Promise<unknown>;
  onEditPlanning?: (task: TaskRead, trigger: HTMLButtonElement) => void;
};

const UNSCHEDULED_PAGE_SIZE = 24;

export function UnscheduledTasksPanel({
  open,
  tasks,
  isPending,
  canUpdate,
  getPhaseLabel,
  onClose,
  onOpenDetail,
  onDragStart,
  onDragEnd,
  onAddToday,
  onEditPlanning,
}: UnscheduledTasksPanelProps) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const [limit, setLimit] = useState(UNSCHEDULED_PAGE_SIZE);
  useEffect(() => {
    if (open) closeButton.current?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <aside
      id="planning-unscheduled"
      aria-labelledby="planning-unscheduled-title"
      className="fixed top-0 right-0 bottom-0 z-40 flex w-full max-w-sm flex-col border-l bg-background shadow-lg"
    >
      <div className="flex items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0">
          <h3 id="planning-unscheduled-title" className="text-base font-medium">
            未日程タスク
          </h3>
          {canUpdate ? (
            <p className="text-sm text-muted-foreground">
              「計画を編集」から予定日を入力するか、ガントの日付位置へドラッグします。
            </p>
          ) : null}
        </div>
        <Button
          ref={closeButton}
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
        >
          <XIcon data-icon="inline-start" />
          <span className="sr-only">閉じる</span>
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {tasks.length ? (
          <div className="flex flex-col gap-2">
            {tasks.slice(0, limit).map((task) => (
              <UnscheduledTaskDragItem
                key={task.id}
                task={task}
                isPending={isPending}
                canUpdate={canUpdate}
                phaseLabel={getPhaseLabel(task)}
                onOpenDetail={onOpenDetail}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onAddToday={onAddToday}
                onEditPlanning={onEditPlanning}
              />
            ))}
            {tasks.length > limit && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setLimit((current) => current + UNSCHEDULED_PAGE_SIZE)
                }
              >
                さらに表示（残り {tasks.length - limit} 件）
              </Button>
            )}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            未日程タスクはありません。
          </p>
        )}
      </div>
    </aside>
  );
}

function UnscheduledTaskDragItem({
  task,
  isPending,
  canUpdate,
  phaseLabel,
  onOpenDetail,
  onDragStart,
  onDragEnd,
  onAddToday,
  onEditPlanning,
}: {
  task: TaskRead;
  isPending: boolean;
  canUpdate: boolean;
  phaseLabel: string;
  onOpenDetail: (taskId: number, trigger: HTMLButtonElement) => void;
  onDragStart: (taskId: number) => void;
  onDragEnd: () => void;
  onAddToday: (task: TaskRead) => Promise<unknown>;
  onEditPlanning?: (task: TaskRead, trigger: HTMLButtonElement) => void;
}) {
  return (
    <div
      draggable={canUpdate && !isPending}
      className="flex items-start gap-2 rounded-lg border bg-card p-3 [&[draggable=true]]:cursor-grab [&[draggable=true]]:active:cursor-grabbing"
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData(UNSCHEDULED_TASK_DND_TYPE, String(task.id));
        setUnscheduledTaskDragImage(event, task);
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
    >
      {canUpdate ? (
        <GripVerticalIcon className="mt-0.5 shrink-0 text-muted-foreground" />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <button
          type="button"
          className="min-w-0 text-left"
          aria-haspopup="dialog"
          onClick={(event) => onOpenDetail(task.id, event.currentTarget)}
        >
          <span className="block truncate text-sm font-medium">
            {task.title}
          </span>
          <span className="text-xs text-muted-foreground">
            {[task.task_code, phaseLabel].filter(Boolean).join(" · ")}
          </span>
        </button>
        <div className="flex flex-wrap gap-1">
          <TaskStatusBadge status={task.status} />
          <TaskFlagBadges
            isOverdue={task.is_overdue}
            isBlocked={task.is_blocked}
          />
        </div>
        {canUpdate ? (
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
        ) : null}
        {onEditPlanning ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={(event) => onEditPlanning(task, event.currentTarget)}
          >
            計画を編集
          </Button>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import type { TaskRead } from "@/lib/api/generated/model";
import { formatDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";

import { TASK_STATUS_OPTIONS } from "../../constants/task-options";
import {
  getBoardCardClassName,
  isTaskBoardInteractiveTarget,
} from "../../lib/task-board";
import {
  TaskFlagBadges,
  TaskPriorityBadge,
  TaskRequirementBadges,
  TaskTags,
  TaskTypeBadge,
} from "../shared/task-badges";
import { TaskDetailLink } from "../tables/tasks-table";

export function TaskBoardCard({
  projectId,
  task,
  canUpdate,
  isPending,
  assigneeLabel,
  onMove,
  onOpenDetail,
}: {
  projectId: number;
  task: TaskRead;
  canUpdate: boolean;
  isPending: boolean;
  assigneeLabel: string;
  onMove: (status: string) => Promise<unknown>;
  onOpenDetail: (taskId: number) => void;
}) {
  const statusIndex = TASK_STATUS_OPTIONS.findIndex(
    (option) => option.value === task.status
  );
  const nextStatus = TASK_STATUS_OPTIONS[statusIndex + 1];
  const handleOpenDetail = (event: React.MouseEvent<HTMLElement>) => {
    if (isTaskBoardInteractiveTarget(event.target)) {
      return;
    }

    onOpenDetail(task.id);
  };

  return (
    <article
      draggable={canUpdate}
      data-draggable={canUpdate ? "true" : undefined}
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-l-4 bg-card p-3 text-card-foreground shadow-sm data-[draggable=true]:cursor-grab",
        getBoardCardClassName(task.status)
      )}
      role="button"
      tabIndex={0}
      onClick={handleOpenDetail}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" &&
          !isTaskBoardInteractiveTarget(event.target)
        ) {
          onOpenDetail(task.id);
        }
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", String(task.id));
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{task.title}</p>
          <p className="text-xs text-muted-foreground">
            {task.task_code ?? "未採番"}
          </p>
        </div>
        <TaskPriorityBadge priority={task.priority} />
      </div>
      <div className="flex flex-wrap gap-1">
        <TaskTypeBadge type={task.task_type} />
        <TaskFlagBadges isOverdue={task.is_overdue} isBlocked={task.is_blocked} />
      </div>
      <TaskRequirementBadges requirements={task.requirements} />
      <TaskTags tags={task.tags} />
      <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <dt>担当</dt>
          <dd className="truncate text-foreground">{assigneeLabel}</dd>
        </div>
        <div>
          <dt>期限</dt>
          <dd className="text-foreground">{formatDate(task.due_date)}</dd>
        </div>
        <div>
          <dt>進捗</dt>
          <dd className="text-foreground">{task.progress_percent ?? 0}%</dd>
        </div>
        <div>
          <dt>開始</dt>
          <dd className="text-foreground">{formatDate(task.start_date)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <TaskDetailLink projectId={projectId} task={task} />
        {canUpdate && nextStatus ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => {
              onMove(nextStatus.value).catch(() => undefined);
            }}
          >
            {nextStatus.label}へ
          </Button>
        ) : null}
      </div>
    </article>
  );
}

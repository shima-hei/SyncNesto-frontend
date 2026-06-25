"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { TaskRead } from "@/lib/api/generated/model";
import { formatDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";

import {
  getTaskPriorityLabel,
  getTaskTypeLabel,
  TASK_STATUS_OPTIONS,
} from "../../constants/task-options";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { useProjectBoards } from "../../hooks/use-project-boards";
import { useUpdateTaskStatus } from "../../hooks/use-update-task-status";
import {
  TaskFlagBadges,
  TaskPriorityBadge,
  TaskRequirementBadges,
  TaskTags,
  TaskTypeBadge,
} from "../shared/task-badges";
import { TaskDetailSheet } from "./task-detail-sheet";
import { TaskDetailLink } from "../tables/tasks-table";

export type BoardSwimlane =
  | "none"
  | "assignee"
  | "requirement"
  | "parent_task"
  | "priority"
  | "task_type";

type TasksBoardSectionProps = {
  projectId: number;
  tasks: TaskRead[];
  canUpdate: boolean;
  swimlane: BoardSwimlane;
  isCompletedCollapsed: boolean;
};

export function TasksBoardSection({
  projectId,
  tasks,
  canUpdate,
  swimlane,
  isCompletedCollapsed,
}: TasksBoardSectionProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const { updateTaskStatus, isPending } = useUpdateTaskStatus(projectId);
  const { getTaskUserLabel } = useTaskUserMap(projectId);
  const { defaultBoard } = useProjectBoards(projectId);
  const tasksById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks]
  );
  const visibleStatuses = TASK_STATUS_OPTIONS.filter(
    (status) =>
      !isCompletedCollapsed ||
      (status.value !== "done" && status.value !== "cancelled")
  );
  const swimlanes = useMemo(() => {
    return getSwimlanes(tasks, swimlane, getTaskUserLabel, tasksById);
  }, [getTaskUserLabel, swimlane, tasks, tasksById]);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, status: string) => {
    event.preventDefault();

    if (!canUpdate) {
      return;
    }

    const task = tasksById.get(Number(event.dataTransfer.getData("text/plain")));

    if (!task || task.status === status) {
      return;
    }

    updateTaskStatus(task, status, {
      boardId: defaultBoard?.id,
      sortOrder: getNextSortOrder(tasks, status),
    }).catch(() => undefined);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-5">
        {swimlanes.map((lane) => (
          <section key={lane.key} className="flex flex-col gap-2">
            {swimlane !== "none" ? (
              <div className="flex items-center justify-between gap-3">
                <h3 className="truncate text-sm font-semibold">{lane.label}</h3>
                <span className="text-xs text-muted-foreground">
                  {lane.tasks.length}件
                </span>
              </div>
            ) : null}
            <div className="overflow-x-auto pb-2">
              <div className="grid auto-cols-[minmax(280px,320px)] grid-flow-col gap-3">
                {visibleStatuses.map((status) => {
                  const columnTasks = lane.tasks.filter(
                    (task) => task.status === status.value
                  );

                  return (
                    <div
                      key={`${lane.key}-${status.value}`}
                      className={cn(
                        "flex h-[clamp(30rem,calc(100vh-14rem),52rem)] min-w-0 flex-col overflow-hidden rounded-lg border",
                        getBoardStatusClassName(status.value)
                      )}
                    >
                      <div className="flex items-center justify-between border-b border-current/20 px-3 py-2">
                        <h4 className="text-sm font-semibold">{status.label}</h4>
                        <span className="rounded-full border border-current/20 bg-background/70 px-2 py-0.5 text-xs font-medium">
                          {columnTasks.length}
                        </span>
                      </div>
                      <div
                        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2"
                        onDragOver={(event) => {
                          if (canUpdate) {
                            event.preventDefault();
                          }
                        }}
                        onDrop={(event) => handleDrop(event, status.value)}
                      >
                        {columnTasks.length ? (
                          columnTasks.map((task) => (
                            <TaskBoardCard
                              key={`${task.id}-${task.version}-${task.assignee_id ?? "none"}-${task.due_date ?? "none"}`}
                              projectId={projectId}
                              task={task}
                              canUpdate={canUpdate}
                              isPending={isPending}
                              assigneeLabel={getTaskUserLabel(task.assignee_id)}
                              onMove={(targetStatus) =>
                                updateTaskStatus(task, targetStatus, {
                                  boardId: defaultBoard?.id,
                                  sortOrder: getNextSortOrder(
                                    tasks,
                                    targetStatus
                                  ),
                                })
                              }
                              onOpenDetail={setSelectedTaskId}
                            />
                          ))
                        ) : (
                          <div className="rounded-lg border border-dashed border-current/25 bg-background/60 p-3 text-xs text-muted-foreground">
                            タスクはありません。
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      </div>
      <TaskDetailSheet
        projectId={projectId}
        taskId={selectedTaskId}
        open={Boolean(selectedTaskId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTaskId(null);
          }
        }}
      />
    </div>
  );
}

function TaskBoardCard({
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
    if (isInteractiveTarget(event.target)) {
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
        if (event.key === "Enter" && !isInteractiveTarget(event.target)) {
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

const getSwimlanes = (
  tasks: TaskRead[],
  swimlane: BoardSwimlane,
  getTaskUserLabel: (userId?: number | null) => string,
  tasksById: Map<number, TaskRead>
) => {
  if (swimlane === "none") {
    return [{ key: "all", label: "すべて", tasks }];
  }

  const lanes = new Map<
    string,
    { key: string; label: string; tasks: TaskRead[] }
  >();

  tasks.forEach((task) => {
    const key = getSwimlaneKey(task, swimlane);
    const lane = lanes.get(key) ?? {
      key,
      label: getSwimlaneLabel(task, swimlane, getTaskUserLabel, tasksById),
      tasks: [],
    };

    lane.tasks.push(task);
    lanes.set(key, lane);
  });

  return Array.from(lanes.values()).sort((left, right) =>
    left.label.localeCompare(right.label, "ja")
  );
};

const getSwimlaneKey = (task: TaskRead, swimlane: BoardSwimlane) => {
  switch (swimlane) {
    case "assignee":
      return task.assignee_id ? `assignee-${task.assignee_id}` : "assignee-none";
    case "requirement": {
      const requirement = task.requirements?.[0];

      return requirement ? `requirement-${requirement.id}` : "requirement-none";
    }
    case "parent_task":
      return task.parent_task_id
        ? `parent-task-${task.parent_task_id}`
        : "parent-task-none";
    case "priority":
      return task.priority ? `priority-${task.priority}` : "priority-none";
    case "task_type":
      return task.task_type ? `task-type-${task.task_type}` : "task-type-none";
    case "none":
    default:
      return "all";
  }
};

const getSwimlaneLabel = (
  task: TaskRead,
  swimlane: BoardSwimlane,
  getTaskUserLabel: (userId?: number | null) => string,
  tasksById: Map<number, TaskRead>
) => {
  switch (swimlane) {
    case "assignee":
      return task.assignee_id ? getTaskUserLabel(task.assignee_id) : "担当者未設定";
    case "requirement": {
      const requirement = task.requirements?.[0];

      return requirement
        ? `${requirement.requirement_code} ${requirement.title}`
        : "関連要件なし";
    }
    case "parent_task": {
      if (!task.parent_task_id) {
        return "親タスクなし";
      }

      const parentTask = tasksById.get(task.parent_task_id);

      return parentTask
        ? `${parentTask.task_code} ${parentTask.title}`
        : `親: ${task.parent_task_id}`;
    }
    case "priority":
      return getTaskPriorityLabel(task.priority);
    case "task_type":
      return getTaskTypeLabel(task.task_type);
    case "none":
    default:
      return "すべて";
  }
};

const isInteractiveTarget = (target: EventTarget | null) => {
  return target instanceof HTMLElement
    ? Boolean(target.closest("a,button,input,select,textarea"))
    : false;
};

const getNextSortOrder = (tasks: TaskRead[], status: string) => {
  const maxSortOrder = tasks
    .filter((task) => task.status === status)
    .reduce((currentMax, task) => Math.max(currentMax, task.sort_order ?? 0), 0);

  return maxSortOrder + 1;
};

const getBoardStatusClassName = (status?: string | null) => {
  return cn(
    "border-[var(--status-neutral-border)] bg-[var(--status-neutral-bg)] text-[var(--status-neutral-fg)]",
    status === "todo" &&
      "border-[var(--status-info-border)] bg-[var(--status-info-bg)] text-[var(--status-info-fg)]",
    status === "in_progress" &&
      "border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
    status === "in_review" &&
      "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]",
    status === "done" &&
      "border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-fg)]",
    status === "blocked" &&
      "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]"
  );
};

const getBoardCardClassName = (status?: string | null) => {
  return cn(
    "border-l-[var(--status-neutral-border)]",
    status === "todo" && "border-l-[var(--status-info-border)]",
    status === "in_progress" && "border-l-[var(--status-progress-border)]",
    status === "in_review" && "border-l-[var(--status-warning-border)]",
    status === "done" && "border-l-[var(--status-success-border)]",
    status === "blocked" && "border-l-[var(--status-danger-border)]"
  );
};

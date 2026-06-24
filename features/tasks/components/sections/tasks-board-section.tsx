"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskRead } from "@/lib/api/generated/model";
import { formatDate } from "@/lib/format/date";

import {
  getTaskPriorityLabel,
  getTaskTypeLabel,
  TASK_STATUS_OPTIONS,
} from "../../constants/task-options";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { useProjectBoards } from "../../hooks/use-project-boards";
import { useUpdateTaskQuick } from "../../hooks/use-update-task-quick";
import { useUpdateTaskStatus } from "../../hooks/use-update-task-status";
import {
  TaskFlagBadges,
  TaskPriorityBadge,
  TaskRequirementBadges,
  TaskTags,
  TaskTypeBadge,
} from "../shared/task-badges";
import { TaskUserSelectField } from "../forms/task-user-select-field";
import { TaskDetailLink } from "../tables/tasks-table";

type BoardSwimlane =
  | "none"
  | "assignee"
  | "requirement"
  | "priority"
  | "task_type";

type TasksBoardSectionProps = {
  projectId: number;
  tasks: TaskRead[];
  canUpdate: boolean;
};

export function TasksBoardSection({
  projectId,
  tasks,
  canUpdate,
}: TasksBoardSectionProps) {
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(true);
  const [swimlane, setSwimlane] = useState<BoardSwimlane>("none");
  const { updateTaskStatus, isPending } = useUpdateTaskStatus(projectId);
  const { updateTaskQuick, isPending: isQuickUpdatePending } =
    useUpdateTaskQuick(projectId);
  const { getTaskUserLabel } = useTaskUserMap(projectId);
  const { defaultBoard } = useProjectBoards(projectId);
  const tasksById = new Map(tasks.map((task) => [String(task.id), task]));
  const visibleStatuses = TASK_STATUS_OPTIONS.filter(
    (status) =>
      !isCompletedCollapsed ||
      (status.value !== "done" && status.value !== "cancelled")
  );
  const swimlanes = useMemo(() => {
    return getSwimlanes(tasks, swimlane, getTaskUserLabel);
  }, [getTaskUserLabel, swimlane, tasks]);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, status: string) => {
    event.preventDefault();

    if (!canUpdate) {
      return;
    }

    const task = tasksById.get(event.dataTransfer.getData("text/plain"));

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
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-xs flex-col gap-2">
          <Label htmlFor="task-board-swimlane">スイムレーン</Label>
          <Select
            value={swimlane}
            onValueChange={(value) => setSwimlane(value as BoardSwimlane)}
          >
            <SelectTrigger id="task-board-swimlane" className="w-full">
              <SelectValue placeholder="スイムレーン" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="none">なし</SelectItem>
                <SelectItem value="assignee">担当者別</SelectItem>
                <SelectItem value="requirement">要件別</SelectItem>
                <SelectItem value="priority">優先度別</SelectItem>
                <SelectItem value="task_type">種別別</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsCompletedCollapsed((current) => !current)}
        >
          {isCompletedCollapsed ? "完了タスクを表示" : "完了タスクを折りたたむ"}
        </Button>
      </div>
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
                      className="flex min-w-0 flex-col rounded-lg border"
                    >
                      <div className="flex items-center justify-between border-b px-3 py-2">
                        <h4 className="text-sm font-medium">{status.label}</h4>
                        <span className="text-xs text-muted-foreground">
                          {columnTasks.length}
                        </span>
                      </div>
                      <div
                        className="flex min-h-40 flex-col gap-2 p-2"
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
                              isQuickUpdatePending={isQuickUpdatePending}
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
                              onQuickUpdate={(values) =>
                                updateTaskQuick(task, values)
                              }
                            />
                          ))
                        ) : (
                          <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
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
    </div>
  );
}

function TaskBoardCard({
  projectId,
  task,
  canUpdate,
  isPending,
  isQuickUpdatePending,
  assigneeLabel,
  onMove,
  onQuickUpdate,
}: {
  projectId: number;
  task: TaskRead;
  canUpdate: boolean;
  isPending: boolean;
  isQuickUpdatePending: boolean;
  assigneeLabel: string;
  onMove: (status: string) => Promise<unknown>;
  onQuickUpdate: (values: {
    assigneeId?: string;
    dueDate?: string;
    tags?: string;
  }) => Promise<unknown>;
}) {
  const router = useRouter();
  const [assigneeId, setAssigneeId] = useState(
    task.assignee_id ? String(task.assignee_id) : ""
  );
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [tags, setTags] = useState((task.tags ?? []).join(", "));
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const statusIndex = TASK_STATUS_OPTIONS.findIndex(
    (option) => option.value === task.status
  );
  const nextStatus = TASK_STATUS_OPTIONS[statusIndex + 1];
  const isQuickDirty =
    assigneeId !== (task.assignee_id ? String(task.assignee_id) : "") ||
    dueDate !== (task.due_date ?? "") ||
    tags !== (task.tags ?? []).join(", ");
  const detailPath = `/projects/joined/${projectId}/tasks/${task.id}`;
  const handleOpenDetail = (event: React.MouseEvent<HTMLElement>) => {
    if (isInteractiveTarget(event.target)) {
      return;
    }

    router.push(detailPath);
  };

  return (
    <article
      draggable={canUpdate}
      data-draggable={canUpdate ? "true" : undefined}
      className="flex flex-col gap-2 rounded-lg border bg-background p-3 data-[draggable=true]:cursor-grab"
      role="button"
      tabIndex={0}
      onClick={handleOpenDetail}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !isInteractiveTarget(event.target)) {
          router.push(detailPath);
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
      {canUpdate ? (
        <Popover open={isQuickEditOpen} onOpenChange={setIsQuickEditOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <PencilIcon data-icon="inline-start" />
              クイック編集
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80">
            <PopoverHeader>
              <PopoverTitle>クイック編集</PopoverTitle>
            </PopoverHeader>
            <div className="flex flex-col gap-3">
              <TaskUserSelectField
                projectId={projectId}
                label="担当者"
                value={assigneeId}
                placeholder="未設定"
                disabled={isQuickUpdatePending}
                onChange={setAssigneeId}
              />
              <div className="flex flex-col gap-1">
                <Label htmlFor={`task-${task.id}-due-date`} className="text-xs">
                  期限
                </Label>
                <Input
                  id={`task-${task.id}-due-date`}
                  type="date"
                  value={dueDate}
                  disabled={isQuickUpdatePending}
                  onChange={(event) => setDueDate(event.target.value)}
                  onDragStart={(event) => event.preventDefault()}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`task-${task.id}-tags`} className="text-xs">
                  タグ
                </Label>
                <Input
                  id={`task-${task.id}-tags`}
                  value={tags}
                  placeholder="frontend, auth"
                  disabled={isQuickUpdatePending}
                  onChange={(event) => setTags(event.target.value)}
                  onDragStart={(event) => event.preventDefault()}
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={!isQuickDirty || isQuickUpdatePending}
                onClick={() => {
                  onQuickUpdate({ assigneeId, dueDate, tags })
                    .then(() => setIsQuickEditOpen(false))
                    .catch(() => undefined);
                }}
              >
                保存
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
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
  getTaskUserLabel: (userId?: number | null) => string
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
      label: getSwimlaneLabel(task, swimlane, getTaskUserLabel),
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
  getTaskUserLabel: (userId?: number | null) => string
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

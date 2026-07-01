import type { TaskRead } from "@/lib/api/generated/model";
import { cn } from "@/lib/utils";

import {
  getTaskPriorityLabel,
  getTaskTypeLabel,
} from "../constants/task-options";

export type BoardSwimlane =
  | "none"
  | "assignee"
  | "requirement"
  | "parent_task"
  | "priority"
  | "task_type";

export type TaskBoardSwimlane = {
  key: string;
  label: string;
  tasks: TaskRead[];
};

export const getTaskBoardSwimlanes = (
  tasks: TaskRead[],
  swimlane: BoardSwimlane,
  getTaskUserLabel: (userId?: number | null) => string,
  tasksById: Map<number, TaskRead>,
): TaskBoardSwimlane[] => {
  if (swimlane === "none") {
    return [{ key: "all", label: "すべて", tasks }];
  }

  const lanes = new Map<string, TaskBoardSwimlane>();

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
    left.label.localeCompare(right.label, "ja"),
  );
};

export const getNextTaskBoardSortOrder = (
  tasks: TaskRead[],
  status: string,
) => {
  const maxSortOrder = tasks
    .filter((task) => task.status === status)
    .reduce(
      (currentMax, task) => Math.max(currentMax, task.sort_order ?? 0),
      0,
    );

  return maxSortOrder + 1;
};

export const getBoardStatusClassName = (status?: string | null) => {
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
      "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]",
  );
};

export const getBoardCardClassName = (status?: string | null) => {
  return cn(
    "border-l-[var(--status-neutral-border)]",
    status === "todo" && "border-l-[var(--status-info-border)]",
    status === "in_progress" && "border-l-[var(--status-progress-border)]",
    status === "in_review" && "border-l-[var(--status-warning-border)]",
    status === "done" && "border-l-[var(--status-success-border)]",
    status === "blocked" && "border-l-[var(--status-danger-border)]",
  );
};

export const isTaskBoardInteractiveTarget = (target: EventTarget | null) => {
  return target instanceof HTMLElement
    ? Boolean(target.closest("a,button,input,select,textarea"))
    : false;
};

const getSwimlaneKey = (task: TaskRead, swimlane: BoardSwimlane) => {
  switch (swimlane) {
    case "assignee":
      return task.assignee_id
        ? `assignee-${task.assignee_id}`
        : "assignee-none";
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
  tasksById: Map<number, TaskRead>,
) => {
  switch (swimlane) {
    case "assignee":
      return task.assignee_id
        ? getTaskUserLabel(task.assignee_id)
        : "担当者未設定";
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

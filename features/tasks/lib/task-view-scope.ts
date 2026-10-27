import type { TaskRead } from "@/lib/api/generated/model";

export const BOARD_TASK_LIMIT = 100;

export const getBoardTaskScope = (
  tasks: TaskRead[],
  total: number,
  completedCollapsed: boolean,
  statusKeys: readonly string[],
) => {
  const known = new Set(statusKeys);
  const unknown = tasks.filter((task) => !known.has(task.status ?? "")).length;
  const folded = completedCollapsed
    ? tasks.filter(
        (task) => task.status === "done" || task.status === "cancelled",
      ).length
    : 0;
  return {
    overLimit: total > BOARD_TASK_LIMIT,
    complete: total <= BOARD_TASK_LIMIT && tasks.length === total,
    folded,
    unknown,
    visible: tasks.length - folded - unknown,
  };
};

import type { TaskDependencyRead, TaskRead } from "@/lib/api/generated/model";
import { toCalendarDateInput } from "@/lib/format/date";

type DependencyTask = Pick<
  TaskRead,
  "id" | "task_code" | "title" | "start_date" | "due_date"
>;

export type GanttDependencyWarning = {
  id: number;
  predecessor: DependencyTask;
  successor: DependencyTask;
  earliestStart: string;
  lagDays: number;
};

export function getGanttDependencyWarnings(
  tasks: Iterable<DependencyTask>,
  dependencies: readonly TaskDependencyRead[],
) {
  const tasksById = new Map(Array.from(tasks, (task) => [task.id, task]));
  const warningsByTask = new Map<number, GanttDependencyWarning[]>();

  for (const dependency of dependencies) {
    if (dependency.dependency_type !== "finish_to_start") continue;

    const predecessor = tasksById.get(dependency.predecessor_task_id);
    const successor = tasksById.get(dependency.successor_task_id);
    if (!predecessor?.due_date || !successor?.start_date) continue;

    const earliest = new Date(predecessor.due_date);
    // 終了予定日を作業日に含め、翌日からラグ分だけ開始をずらす。
    earliest.setUTCDate(earliest.getUTCDate() + 1 + dependency.lag_days);
    const successorStart = new Date(successor.start_date);
    if (
      !Number.isFinite(earliest.getTime()) ||
      !Number.isFinite(successorStart.getTime()) ||
      successorStart >= earliest
    )
      continue;

    const warning: GanttDependencyWarning = {
      id: dependency.id,
      predecessor,
      successor,
      earliestStart: toCalendarDateInput(earliest),
      lagDays: dependency.lag_days,
    };
    for (const taskId of [predecessor.id, successor.id]) {
      const warnings = warningsByTask.get(taskId);
      if (warnings) warnings.push(warning);
      else warningsByTask.set(taskId, [warning]);
    }
  }

  return warningsByTask;
}

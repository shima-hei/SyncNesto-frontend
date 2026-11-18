import type { TaskRead } from "@/lib/api/generated/model";

export const effortMeasures = [
  { key: "estimated", label: "見積工数", tone: "info" },
  { key: "planned", label: "計画工数", tone: "resolved" },
  { key: "actual", label: "実績工数", tone: "success" },
  { key: "remaining", label: "残工数", tone: "progress" },
] as const;
export type Measure = (typeof effortMeasures)[number]["key"];
export type EffortFilter = {
  search: string;
  phase: string;
  assignee: string;
  from: string;
  to: string;
  issue: "" | "missing" | "over";
};
export const initialEffortFilter: EffortFilter = {
  search: "",
  phase: "",
  assignee: "",
  from: "",
  to: "",
  issue: "",
};

export const phaseKey = (task: TaskRead) =>
  task.phase_scope === "phase"
    ? String(task.phase_id)
    : (task.phase_scope ?? "unclassified");

export const isActiveEffort = (task: TaskRead) =>
  task.status !== "done" && task.status !== "cancelled";

export function hasEffortIssue(task: TaskRead, issue: EffortFilter["issue"]) {
  if (issue === "missing")
    return task.estimated_basis === "own" && task.estimated_minutes == null;
  if (issue === "over")
    return (
      task.actual_basis === "own" &&
      task.actual_minutes != null &&
      task.planned_minutes != null &&
      task.actual_minutes > task.planned_minutes
    );
  return true;
}

export function filterEffortTasks(
  tasks: TaskRead[],
  filter: EffortFilter,
  userLabel: (id?: number | null) => string,
) {
  if (filter.from && filter.to && filter.from > filter.to) return [];
  const search = filter.search.trim().toLocaleLowerCase();
  return tasks.filter((task) => {
    if (filter.phase && phaseKey(task) !== filter.phase) return false;
    if (
      filter.assignee &&
      String(task.assignee_id ?? "none") !== filter.assignee
    )
      return false;
    if (filter.from || filter.to) {
      const first = task.start_date ?? task.due_date;
      const last = task.due_date ?? task.start_date;
      if (
        !first ||
        !last ||
        (filter.from && last < filter.from) ||
        (filter.to && first > filter.to)
      )
        return false;
    }
    return (
      hasEffortIssue(task, filter.issue) &&
      (!search ||
        [task.title, task.task_code, userLabel(task.assignee_id)].some(
          (value) => value.toLocaleLowerCase().includes(search),
        ))
    );
  });
}

export type MeasureTotal = {
  minutes: number;
  entered: number;
  missing: number;
  unreviewed: number;
};
export function sumMeasure(tasks: TaskRead[], measure: Measure): MeasureTotal {
  const total = { minutes: 0, entered: 0, missing: 0, unreviewed: 0 };
  for (const task of tasks) {
    if (measure === "remaining" && !isActiveEffort(task)) continue;
    if (measure === "estimated" || measure === "actual") {
      const basis = task[`${measure}_basis`];
      if (basis === "rollup") continue;
      if (basis !== "own") {
        total.unreviewed++;
        continue;
      }
    }
    const value = task[`${measure}_minutes`];
    if (value == null) total.missing++;
    else {
      total.entered++;
      total.minutes += value;
    }
  }
  return total;
}

export function groupEffortTasks(
  tasks: TaskRead[],
  key: (task: TaskRead) => string,
) {
  const groups = new Map<string, TaskRead[]>();
  for (const task of tasks) {
    const id = key(task);
    const group = groups.get(id);
    if (group) group.push(task);
    else groups.set(id, [task]);
  }
  return groups;
}

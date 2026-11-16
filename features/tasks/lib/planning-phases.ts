import type { PhaseRead, TaskRead } from "@/lib/api/generated/model";

export function getPlanningPhaseKey(task: TaskRead) {
  if (task.phase_scope === "phase" && task.phase_id)
    return `phase:${task.phase_id}`;
  return task.phase_scope === "shared" ? "shared" : "unclassified";
}

export function getPlanningPhaseLabels(phases: PhaseRead[]) {
  return new Map([
    ...phases.map((phase): [string, string] => [
      `phase:${phase.id}`,
      `${phase.name}${phase.archived_at ? "（アーカイブ済み）" : ""}`,
    ]),
    ["shared", "共通作業"],
    ["unclassified", "未分類"],
  ]);
}

export function groupPlanningTasks(tasks: TaskRead[], phases: PhaseRead[]) {
  const labels = getPlanningPhaseLabels(phases);
  const groups = new Map<string, TaskRead[]>();
  for (const task of tasks) {
    const key = getPlanningPhaseKey(task);
    const rows = groups.get(key);
    if (rows) rows.push(task);
    else groups.set(key, [task]);
    if (!labels.has(key)) labels.set(key, `工程 #${task.phase_id}`);
  }
  return Array.from(labels).flatMap(([key, label]) => {
    const tasks = groups.get(key);
    return tasks ? [{ key, label, tasks }] : [];
  });
}

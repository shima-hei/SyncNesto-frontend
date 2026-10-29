import type { TaskRead } from "@/lib/api/generated/model";

export type TaskStatusFilter =
  { kind: "all" } | { kind: "include" | "exclude"; values: string[] };

export const TASK_HIERARCHY_OPTIONS = [
  { value: "parent", label: "親タスクのみ" },
  { value: "root_parent", label: "最上位の親タスク" },
  { value: "middle_parent", label: "中間の親タスク" },
  { value: "leaf", label: "末端の子タスク" },
  { value: "standalone", label: "単独タスク" },
] as const;

export type TaskHierarchyFilter =
  (typeof TASK_HIERARCHY_OPTIONS)[number]["value"];

function statusValues(values: string[]) {
  return [
    ...new Set(
      values.filter((value) => value.length > 0 && value.length <= 200),
    ),
  ]
    .slice(0, 50)
    .sort();
}

export function readTaskStatusFilter(
  params: Pick<URLSearchParams, "get" | "getAll">,
): TaskStatusFilter {
  const included = statusValues(params.getAll("statuses"));
  if (included.length) return { kind: "include", values: included };
  const excluded = statusValues(params.getAll("excludeStatuses"));
  if (excluded.length) return { kind: "exclude", values: excluded };
  const legacy = params.get("status");
  if (legacy && legacy !== "all") return { kind: "include", values: [legacy] };
  return { kind: "all" };
}

export function setTaskStatusFilterParams(
  params: URLSearchParams,
  filter: TaskStatusFilter,
) {
  for (const key of ["page", "status", "statuses", "excludeStatuses"])
    params.delete(key);
  if (filter.kind === "all") return;
  const key = filter.kind === "include" ? "statuses" : "excludeStatuses";
  for (const value of statusValues(filter.values)) params.append(key, value);
}

export function getTaskStatusQuery(filter: TaskStatusFilter) {
  return {
    statuses: filter.kind === "include" ? filter.values : undefined,
    exclude_statuses: filter.kind === "exclude" ? filter.values : undefined,
  };
}

export function getSelectedTaskStatuses(
  filter: TaskStatusFilter,
  options: readonly { value: string }[],
) {
  if (filter.kind === "all") return [];
  if (filter.kind === "include") return filter.values;
  return options
    .filter((option) => !filter.values.includes(option.value))
    .map((option) => option.value);
}

export function getTaskStatusFilterLabel(
  filter: TaskStatusFilter,
  options: readonly { value: string; label: string }[],
) {
  if (filter.kind === "all") return "すべてのステータス";
  if (
    filter.kind === "exclude" &&
    filter.values.length === 1 &&
    filter.values[0] === "done"
  )
    return "完了以外";
  if (
    filter.kind === "exclude" &&
    filter.values.length === 2 &&
    filter.values.includes("done") &&
    filter.values.includes("cancelled")
  )
    return "完了・中止以外";
  const labels = filter.values
    .map(
      (value) =>
        options.find((option) => option.value === value)?.label ?? value,
    )
    .join("・");
  return filter.kind === "exclude" ? `除外: ${labels}` : labels;
}

export function readTaskHierarchyFilter(
  value: string | null,
): TaskHierarchyFilter | "all" {
  return (
    TASK_HIERARCHY_OPTIONS.find((option) => option.value === value)?.value ??
    "all"
  );
}

export function getTaskHierarchyLabel(
  task: Pick<TaskRead, "parent_task_id" | "has_children">,
) {
  if (typeof task.has_children !== "boolean") return null;
  if (task.has_children)
    return task.parent_task_id ? "中間の親タスク" : "最上位の親タスク";
  return task.parent_task_id ? "末端の子タスク" : "単独タスク";
}

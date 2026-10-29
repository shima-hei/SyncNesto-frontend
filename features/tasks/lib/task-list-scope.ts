import type { TaskRead } from "@/lib/api/generated/model";

export type TaskListScope =
  | { kind: "all" }
  | { kind: "roots" }
  | { kind: "children"; parentTaskId: number };

export function readTaskId(value: string | null | undefined): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

export function resolveTaskReference(
  projectId: number,
  taskId: number | null,
  candidates: readonly (TaskRead | null | undefined)[],
) {
  return (
    candidates.find(
      (task) => task?.id === taskId && task.project_id === projectId,
    ) ?? null
  );
}

export function readTaskListScope(
  params: Pick<URLSearchParams, "get">,
): TaskListScope {
  const kind = params.get("taskScope");
  if (kind === "roots") return { kind };
  const parentTaskId = readTaskId(params.get("parentTaskId"));
  if (kind === "children" && parentTaskId !== null) {
    return { kind, parentTaskId };
  }
  return { kind: "all" };
}

export function getTaskListScopeQuery(scope: TaskListScope) {
  return {
    parent_task_id: scope.kind === "children" ? scope.parentTaskId : undefined,
    root_only: scope.kind === "roots" ? true : undefined,
  };
}

export function setTaskListScopeParams(
  params: URLSearchParams,
  scope: TaskListScope,
) {
  params.delete("page");
  params.delete("parentTaskId");
  if (scope.kind === "all") params.delete("taskScope");
  else params.set("taskScope", scope.kind);
  if (scope.kind === "children")
    params.set("parentTaskId", String(scope.parentTaskId));
}

export function clearTaskListFilters(params: URLSearchParams) {
  for (const key of [
    "page",
    "q",
    "status",
    "statuses",
    "excludeStatuses",
    "hierarchy",
    "priority",
    "taskType",
    "overdue",
    "assigneeId",
    "assignee",
    "ganttAssigneeId",
    "requirementId",
    "ganttRequirementId",
    "tag",
    "startDateFrom",
    "dueDateTo",
    "sort",
  ])
    params.delete(key);
}

export function getTaskParentSummary(
  task: TaskRead,
  tasksById?: Map<number, TaskRead>,
) {
  if (!task.parent_task_id) return null;
  const summary = task.parent_summary;
  if (summary?.id === task.parent_task_id) return summary;
  const parent = tasksById?.get(task.parent_task_id);
  return parent?.project_id === task.project_id ? parent : null;
}

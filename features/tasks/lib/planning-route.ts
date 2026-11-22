const planningSearchKeys = [
  "ganttStartDate",
  "ganttEndDate",
  "ganttRangeMode",
  "ganttDisplayUnit",
  "assigneeId",
  "requirementId",
  "overviewReturn",
] as const;

export function getPlanningHref(
  projectId: number,
  source: Pick<URLSearchParams, "get">,
) {
  const params = new URLSearchParams();
  for (const key of planningSearchKeys) {
    const value = source.get(key);
    if (value !== null) params.set(key, value);
  }
  for (const [key, legacy] of [
    ["assigneeId", "ganttAssigneeId"],
    ["requirementId", "ganttRequirementId"],
  ]) {
    const value = source.get(legacy);
    if (!params.has(key) && value !== null) params.set(key, value);
  }
  if (!params.has("assigneeId") && source.get("assignee") === "me") {
    params.set("assignee", "me");
  }
  return `/projects/joined/${projectId}/planning${params.size ? `?${params}` : ""}`;
}

export function getTaskEstimateHref(projectId: number, taskId: number) {
  return `/projects/joined/${projectId}/planning?planningView=estimate&estimateTask=${taskId}`;
}

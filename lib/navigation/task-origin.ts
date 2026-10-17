import { safeListReturn, withListReturn } from "./list-return";

export type TaskOrigin = {
  projectId: number;
  taskId: number;
  listReturn: string;
};
const originKeys = ["originProject", "originTask", "originList"] as const;
const base = "https://syncnesto.invalid";
const validId = (value: string | null) =>
  value !== null && /^[1-9]\d*$/.test(value) && Number(value) <= 2147483647;

export function createTaskOrigin(
  projectId: number,
  taskId: number,
  listReturn: string | null,
): TaskOrigin {
  const fallback = `/projects/joined/${projectId}/tasks?tab=list`;
  const url = new URL(safeListReturn(listReturn, fallback), base);
  for (const key of originKeys) url.searchParams.delete(key);
  return { projectId, taskId, listReturn: `${url.pathname}${url.search}` };
}

export function readTaskOrigin(
  params: Pick<URLSearchParams, "get">,
  projectId: number,
): TaskOrigin | null {
  const task = params.get("originTask");
  if (params.get("originProject") !== String(projectId) || !validId(task))
    return null;
  const list = params.get("originList");
  return createTaskOrigin(
    projectId,
    Number(task),
    list && list.length <= 4096 ? list : null,
  );
}

export function taskOriginHref(origin: TaskOrigin): string {
  return withListReturn(
    `/projects/joined/${origin.projectId}/tasks/${origin.taskId}`,
    createTaskOrigin(origin.projectId, origin.taskId, origin.listReturn)
      .listReturn,
  );
}

export function withTaskOrigin(
  href: string,
  origin: TaskOrigin | null,
): string {
  if (!origin) return href;
  const url = new URL(href, base);
  if (url.origin !== base) return href;
  const prefix = `/projects/joined/${origin.projectId}`;
  if (url.pathname === `${prefix}/tasks/${origin.taskId}`)
    return taskOriginHref(origin);
  const relative = url.pathname.slice(prefix.length);
  if (
    !url.pathname.startsWith(`${prefix}/`) ||
    !/^\/(?:requirements\/[1-9]\d*\/items\/[1-9]\d*|specifications\/[1-9]\d*)(?:\/edit)?$/.test(
      relative,
    )
  )
    return href;
  url.searchParams.set("originProject", String(origin.projectId));
  url.searchParams.set("originTask", String(origin.taskId));
  url.searchParams.set(
    "originList",
    createTaskOrigin(origin.projectId, origin.taskId, origin.listReturn)
      .listReturn,
  );
  return `${url.pathname}${url.search}${url.hash}`;
}

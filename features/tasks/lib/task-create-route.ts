import type { TaskFormValues } from "../types/task-form";

const base = "https://syncnesto.invalid";
const positiveId = (value: string | null) =>
  value && /^[1-9]\d*$/.test(value) && Number(value) <= 2147483647
    ? Number(value)
    : null;

export function readTaskCreateReturn(
  projectId: number,
  candidate: string | null,
) {
  if (!candidate || candidate.length > 4096) return null;
  try {
    const url = new URL(candidate, base);
    const prefix = `/projects/joined/${projectId}/`;
    if (url.origin !== base || !url.pathname.startsWith(prefix)) return null;
    const path = url.pathname.slice(prefix.length);
    if (
      !/^(?:tasks(?:\/[1-9]\d*)?|planning|requirements\/[1-9]\d*\/items\/[1-9]\d*)$/.test(
        path,
      )
    )
      return null;
    url.searchParams.delete("createReturn");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function readTaskCreateContext(params: Pick<URLSearchParams, "get">) {
  const phase = params.get("phase");
  const phaseId = phase?.startsWith("phase:")
    ? positiveId(phase.slice(6))
    : null;
  const draft = params.get("draft");
  return {
    parentId: positiveId(params.get("parent")),
    requirementId: positiveId(params.get("requirement")),
    requirementOrigin: params.get("source") === "requirement",
    phaseAssignment: phaseId
      ? `phase:${phaseId}`
      : phase === "shared"
        ? phase
        : null,
    draftId:
      draft && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/.test(draft)
        ? draft
        : null,
  };
}

export function getTaskCreateHref(
  projectId: number,
  values: Pick<
    TaskFormValues,
    "parentTaskId" | "requirementId" | "phaseAssignment"
  >,
  returnTo: string,
  options?: { requirementOrigin?: boolean; draftId?: string },
) {
  const params = new URLSearchParams();
  const source = readTaskCreateReturn(projectId, returnTo);
  if (source) params.set("returnTo", source);
  if (values.parentTaskId) params.set("parent", values.parentTaskId);
  if (values.requirementId) params.set("requirement", values.requirementId);
  if (values.phaseAssignment !== "unclassified")
    params.set("phase", values.phaseAssignment);
  if (options?.requirementOrigin) params.set("source", "requirement");
  if (options?.draftId) params.set("draft", options.draftId);
  return `/projects/joined/${projectId}/tasks/new${params.size ? `?${params}` : ""}`;
}

export function getTaskCreateDraftScope(projectId: number, draftId: string) {
  return `task:${projectId}:create-page:${draftId}`;
}

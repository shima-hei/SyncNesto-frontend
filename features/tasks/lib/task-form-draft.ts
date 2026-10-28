import type { TaskFormValues } from "../types/task-form";

export type TaskFormDraft = {
  values: TaskFormValues;
  initialValues: TaskFormValues;
};

export const getTaskFormDraftScope = (
  projectId: number,
  mode: "create" | "update",
  initialValues: TaskFormValues,
  currentTaskId?: number,
) => {
  if (mode === "update") return `task:${projectId}:edit:${currentTaskId}`;
  if (initialValues.parentTaskId)
    return `task:${projectId}:child:${initialValues.parentTaskId}`;
  if (initialValues.requirementId)
    return `task:${projectId}:requirement:${initialValues.requirementId}`;
  return `task:${projectId}:new`;
};

export const mergeTaskFormDraft = (
  draft: TaskFormDraft,
  current: TaskFormValues,
): TaskFormValues => {
  const merged = { ...current };
  for (const field of Object.keys(current) as (keyof TaskFormValues)[]) {
    if (draft.values[field] !== draft.initialValues[field]) {
      Object.assign(merged, { [field]: draft.values[field] });
    }
  }
  return merged;
};

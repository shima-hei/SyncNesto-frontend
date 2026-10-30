import type {
  TaskRead,
  TaskUpdate,
  TaskPlanningUpdate,
} from "@/lib/api/generated/model";

export const LIST_EDIT_FIELDS = ["status", "assigneeId", "dueDate"] as const;
export type ListEditValues = {
  status: string;
  assigneeId: string;
  dueDate: string;
};
export type ListEditDraft = { baseline: TaskRead; values: ListEditValues };
export function getListEditValues(task: TaskRead): ListEditValues {
  return {
    status: task.status ?? "todo",
    assigneeId: task.assignee_id ? String(task.assignee_id) : "",
    dueDate: task.due_date ?? "",
  };
}
export function listEditChanges(draft: ListEditDraft) {
  const original = getListEditValues(draft.baseline);
  return LIST_EDIT_FIELDS.filter(
    (field) => original[field] !== draft.values[field],
  );
}
export function rebaseListEdit(
  draft: ListEditDraft,
  current: TaskRead,
): ListEditDraft {
  const values = getListEditValues(current);
  for (const field of listEditChanges(draft))
    values[field] = draft.values[field];
  return { baseline: current, values };
}
export function isListEditReflected(draft: ListEditDraft, current: TaskRead) {
  return (
    current.id === draft.baseline.id &&
    current.project_id === draft.baseline.project_id &&
    listEditChanges(draft).every(
      (field) => getListEditValues(current)[field] === draft.values[field],
    )
  );
}
export function validateListEdit(draft: ListEditDraft) {
  if (
    draft.values.assigneeId &&
    (!/^\d+$/.test(draft.values.assigneeId) ||
      Number(draft.values.assigneeId) <= 0 ||
      Number(draft.values.assigneeId) > 2147483647)
  )
    return "担当者を選び直してください。";
  const due = draft.values.dueDate;
  if (
    due &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(due) ||
      Number.isNaN(Date.parse(due)) ||
      new Date(due).toISOString().slice(0, 10) !== due)
  )
    return "有効な期限を入力してください。";
  if (
    listEditChanges(draft).includes("dueDate") &&
    due &&
    draft.baseline.start_date &&
    due < draft.baseline.start_date
  )
    return "期限は開始日以降にしてください。";
  return null;
}
export function toListEditMutation(
  draft: ListEditDraft,
):
  | { contract: "task"; data: TaskUpdate }
  | { contract: "planning"; data: TaskPlanningUpdate } {
  const fields = listEditChanges(draft);
  const data: TaskPlanningUpdate = { version: draft.baseline.version };
  if (fields.includes("assigneeId"))
    data.assignee_id = draft.values.assigneeId
      ? Number(draft.values.assigneeId)
      : null;
  if (fields.includes("dueDate")) data.due_date = draft.values.dueDate || null;
  return fields.includes("status")
    ? {
        contract: "task",
        data: {
          ...data,
          status: draft.values.status,
          ...(draft.values.status === "done" ? { progress_percent: 100 } : {}),
        },
      }
    : { contract: "planning", data };
}
export function readListEditDrafts(raw: unknown, projectId: number) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return {} as Record<number, ListEditDraft & { uncertain?: boolean }>;
  return Object.fromEntries(
    Object.entries(raw).filter(([id, row]) => {
      if (!row || typeof row !== "object") return false;
      const draft = row as ListEditDraft;
      return (
        draft.baseline?.project_id === projectId &&
        draft.baseline.id === Number(id) &&
        Number.isSafeInteger(draft.baseline.id) &&
        draft.baseline.id > 0 &&
        Number.isSafeInteger(draft.baseline.version) &&
        draft.baseline.version > 0 &&
        LIST_EDIT_FIELDS.every(
          (field) =>
            typeof draft.values?.[field] === "string" &&
            draft.values[field].length <= 200,
        )
      );
    }),
  ) as Record<number, ListEditDraft & { uncertain?: boolean }>;
}

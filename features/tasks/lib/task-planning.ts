import type {
  TaskPlanningUpdate,
  TaskRead,
  TaskUpdate,
} from "@/lib/api/generated/model";

export type TaskPlanningValues = {
  assigneeId: string;
  startDate: string;
  dueDate: string;
  estimatedMinutes: string;
  status: string;
  progressPercent: string;
  changeReason: string;
};

export type TaskPlanningDraft = {
  baseline: TaskRead;
  values: TaskPlanningValues;
};

export const PLANNING_LABELS: Record<keyof TaskPlanningValues, string> = {
  assigneeId: "担当者",
  startDate: "開始予定日",
  dueDate: "終了予定日",
  estimatedMinutes: "見積入力（分）",
  status: "状態",
  progressPercent: "進捗率",
  changeReason: "変更理由",
};

const planningFields = [
  "assigneeId",
  "startDate",
  "dueDate",
  "estimatedMinutes",
] as const;
const dailyFields = [...planningFields, "status", "progressPercent"] as const;

export const getTaskPlanningValues = (task: TaskRead): TaskPlanningValues => ({
  assigneeId: task.assignee_id == null ? "" : String(task.assignee_id),
  startDate: task.start_date ?? "",
  dueDate: task.due_date ?? "",
  estimatedMinutes:
    task.estimated_minutes == null ? "" : String(task.estimated_minutes),
  status: task.status ?? "backlog",
  progressPercent: String(task.progress_percent ?? 0),
  changeReason: "",
});

export const isPlanningDirty = (draft: TaskPlanningDraft) => {
  const original = getTaskPlanningValues(draft.baseline);
  return dailyFields.some((key) => original[key] !== draft.values[key]);
};

export const getPlanningValidation = (
  values: TaskPlanningValues,
  dateChanged = true,
) => {
  if (
    values.estimatedMinutes !== "" &&
    (!/^\d+$/.test(values.estimatedMinutes) ||
      !Number.isSafeInteger(Number(values.estimatedMinutes)))
  )
    return "見積は0〜2147483647の整数（分）で入力してください。空欄は未設定です。";
  if (Number(values.estimatedMinutes) > 2147483647)
    return "見積は0〜2147483647の整数（分）で入力してください。空欄は未設定です。";
  if (
    dateChanged &&
    values.startDate &&
    values.dueDate &&
    values.startDate > values.dueDate
  )
    return "開始予定日は終了予定日以前にしてください。";
  return null;
};

export const toTaskPlanningUpdate = (
  draft: TaskPlanningDraft,
): TaskPlanningUpdate => {
  const original = getTaskPlanningValues(draft.baseline);
  const { values } = draft;
  return {
    version: draft.baseline.version,
    ...(values.assigneeId !== original.assigneeId
      ? { assignee_id: values.assigneeId ? Number(values.assigneeId) : null }
      : {}),
    ...(values.startDate !== original.startDate
      ? { start_date: values.startDate || null }
      : {}),
    ...(values.dueDate !== original.dueDate
      ? { due_date: values.dueDate || null }
      : {}),
    ...(values.estimatedMinutes !== original.estimatedMinutes
      ? {
          estimated_minutes:
            values.estimatedMinutes === ""
              ? null
              : Number(values.estimatedMinutes),
        }
      : {}),
  };
};

export const toTaskProgressUpdate = (
  draft: TaskPlanningDraft,
): TaskUpdate | null => {
  const original = getTaskPlanningValues(draft.baseline);
  const { values } = draft;
  const statusChanged = original.status !== values.status;
  const progressChanged = original.progressPercent !== values.progressPercent;
  if (!statusChanged && !progressChanged) return null;
  return {
    version: draft.baseline.version,
    ...(statusChanged ? { status: values.status } : {}),
    ...(progressChanged
      ? { progress_percent: Number(values.progressPercent) }
      : {}),
    ...(values.changeReason.trim()
      ? { change_reason: values.changeReason.trim() }
      : {}),
  };
};

export const getProgressValidation = (draft: TaskPlanningDraft) => {
  const update = toTaskProgressUpdate(draft);
  if (!update) return null;
  const { status, progressPercent, changeReason } = draft.values;
  if (!/^\d{1,3}$/.test(progressPercent) || Number(progressPercent) > 100)
    return "進捗率は0〜100の整数で入力してください。";
  if (status === "done" && Number(progressPercent) !== 100)
    return "完了にするには進捗率を100%にしてください。";
  if (update.status === "returned" && !changeReason.trim())
    return "差し戻し理由を入力してください。";
  return null;
};

export const rebaseAfterPlanningSave = (
  draft: TaskPlanningDraft,
  saved: TaskRead,
): TaskPlanningDraft => ({
  baseline: saved,
  values: {
    ...getTaskPlanningValues(saved),
    status: draft.values.status,
    progressPercent: draft.values.progressPercent,
    changeReason: draft.values.changeReason,
  },
});

// 他の利用者の変更は保持し、自分が編集した項目だけを比較・再選択する。
export const mergePlanningValues = (
  draft: TaskPlanningDraft,
  current: TaskRead,
) => {
  const original = getTaskPlanningValues(draft.baseline);
  const merged = getTaskPlanningValues(current);
  for (const key of Object.keys(original) as (keyof TaskPlanningValues)[]) {
    if (draft.values[key] !== original[key]) merged[key] = draft.values[key];
  }
  return merged;
};

export const isPlanningReflected = (
  draft: TaskPlanningDraft,
  current: TaskRead,
) => {
  const original = getTaskPlanningValues(draft.baseline);
  const latest = getTaskPlanningValues(current);
  return (Object.keys(original) as (keyof TaskPlanningValues)[]).every(
    (key) =>
      key === "changeReason" ||
      draft.values[key] === original[key] ||
      latest[key] === draft.values[key] ||
      (key === "progressPercent" &&
        Number(latest[key]) === Number(draft.values[key])),
  );
};

export const overlayPlanningTask = (
  task: TaskRead,
  values: TaskPlanningValues,
): TaskRead => ({
  ...task,
  start_date: values.startDate || null,
  due_date: values.dueDate || null,
  assignee_id: values.assigneeId ? Number(values.assigneeId) : null,
  status: values.status,
  progress_percent:
    /^\d{1,3}$/.test(values.progressPercent) &&
    Number(values.progressPercent) <= 100
      ? Number(values.progressPercent)
      : task.progress_percent,
});

export const getPlanningDraftScope = (projectId: number) =>
  `task:${projectId}:planning`;

export const readPlanningDrafts = (
  value: unknown,
  projectId: number,
): Record<number, TaskPlanningDraft> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const drafts: Record<number, TaskPlanningDraft> = {};
  for (const [id, raw] of Object.entries(value)) {
    if (
      !raw ||
      typeof raw !== "object" ||
      !("baseline" in raw) ||
      !("values" in raw)
    )
      continue;
    const draft = raw as TaskPlanningDraft;
    if (
      !draft.baseline ||
      draft.baseline.id !== Number(id) ||
      draft.baseline.project_id !== projectId ||
      !Number.isInteger(draft.baseline.version) ||
      !draft.values ||
      !planningFields.every((key) => typeof draft.values[key] === "string")
    )
      continue;
    const original = getTaskPlanningValues(draft.baseline);
    const values = { ...original };
    for (const key of Object.keys(original) as (keyof TaskPlanningValues)[]) {
      if (typeof draft.values[key] === "string")
        values[key] = draft.values[key];
    }
    drafts[Number(id)] = { baseline: draft.baseline, values };
  }
  return drafts;
};

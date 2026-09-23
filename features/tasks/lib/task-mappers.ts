import type {
  RequirementTaskCreate,
  TaskCreate,
  TaskRead,
  TaskUpdate,
} from "@/lib/api/generated/model";

import type { TaskFormValues } from "../types/task-form";

export const defaultTaskFormValues: TaskFormValues = {
  taskCode: "",
  title: "",
  description: "",
  taskType: "frontend",
  status: "todo",
  priority: "medium",
  assigneeId: "",
  reporterId: "",
  startDate: "",
  dueDate: "",
  actualStartDate: "",
  actualEndDate: "",
  progressPercent: "0",
  estimatedMinutes: "",
  actualMinutes: "",
  parentTaskId: "",
  requirementId: "",
  relationType: "implements",
  tags: "",
  sortOrder: "0",
  changeReason: "",
};

export const getTaskFormValues = (task: TaskRead): TaskFormValues => {
  return {
    taskCode: task.task_code,
    title: task.title,
    description: task.description ?? "",
    taskType: task.task_type ?? "frontend",
    status: task.status ?? "todo",
    priority: task.priority ?? "medium",
    assigneeId: toFormNumber(task.assignee_id),
    reporterId: toFormNumber(task.reporter_id),
    startDate: task.start_date ?? "",
    dueDate: task.due_date ?? "",
    actualStartDate: task.actual_start_date ?? "",
    actualEndDate: task.actual_end_date ?? "",
    progressPercent: String(task.progress_percent ?? 0),
    estimatedMinutes: toFormNumber(task.estimated_minutes),
    actualMinutes: toFormNumber(task.actual_minutes),
    parentTaskId: toFormNumber(task.parent_task_id),
    requirementId: toFormNumber(task.requirements?.[0]?.id),
    relationType: task.requirements?.[0]?.relation_type ?? "implements",
    tags: toTagText(task.tags),
    sortOrder: String(task.sort_order ?? 0),
    changeReason: "",
  };
};

export const toTaskCreate = (values: TaskFormValues): TaskCreate => {
  return {
    parent_task_id: toOptionalNumber(values.parentTaskId),
    ...(toOptionalString(values.taskCode)
      ? { task_code: toOptionalString(values.taskCode) }
      : {}),
    title: values.title.trim(),
    description: toOptionalString(values.description),
    task_type: values.taskType,
    status: values.status,
    priority: values.priority,
    assignee_id: toOptionalNumber(values.assigneeId),
    reporter_id: toOptionalNumber(values.reporterId),
    start_date: toOptionalString(values.startDate),
    due_date: toOptionalString(values.dueDate),
    actual_start_date: toOptionalString(values.actualStartDate),
    actual_end_date: toOptionalString(values.actualEndDate),
    progress_percent: toOptionalNumber(values.progressPercent) ?? 0,
    estimated_minutes: toOptionalNumber(values.estimatedMinutes),
    actual_minutes: toOptionalNumber(values.actualMinutes),
    sort_order: toOptionalNumber(values.sortOrder) ?? 0,
    tags: toTagArray(values.tags),
    requirement_id: toOptionalNumber(values.requirementId),
    relation_type: values.relationType || "implements",
  };
};

export const toRequirementTaskCreate = (
  values: TaskFormValues,
): RequirementTaskCreate => {
  return toTaskCreate(values);
};

export const toTaskDuplicateCreate = (task: TaskRead): TaskCreate => {
  return {
    parent_task_id: task.parent_task_id ?? null,
    title: `${task.title} のコピー`,
    description: task.description ?? null,
    task_type: task.task_type ?? "frontend",
    status: "backlog",
    priority: task.priority ?? "medium",
    assignee_id: task.assignee_id ?? null,
    reporter_id: task.reporter_id ?? null,
    start_date: task.start_date ?? null,
    due_date: task.due_date ?? null,
    actual_start_date: null,
    actual_end_date: null,
    progress_percent: 0,
    estimated_minutes: task.estimated_minutes ?? null,
    actual_minutes: null,
    sort_order: task.sort_order ?? 0,
    tags: task.tags ?? [],
    requirement_id: null,
    relation_type: "implements",
  };
};

export const toTaskUpdate = (
  values: TaskFormValues,
  version: number,
  currentTask?: TaskRead,
): TaskUpdate => {
  const nextValues: TaskUpdate = {
    version,
    parent_task_id: toOptionalNumber(values.parentTaskId),
    task_code: values.taskCode.trim(),
    title: values.title.trim(),
    description: toOptionalString(values.description),
    task_type: values.taskType,
    status: values.status,
    priority: values.priority,
    assignee_id: toOptionalNumber(values.assigneeId),
    reporter_id: toOptionalNumber(values.reporterId),
    start_date: toOptionalString(values.startDate),
    due_date: toOptionalString(values.dueDate),
    actual_start_date: toOptionalString(values.actualStartDate),
    actual_end_date: toOptionalString(values.actualEndDate),
    progress_percent: toOptionalNumber(values.progressPercent),
    estimated_minutes: toOptionalNumber(values.estimatedMinutes),
    actual_minutes: toOptionalNumber(values.actualMinutes),
    sort_order: toOptionalNumber(values.sortOrder),
    tags: toTagArray(values.tags),
    change_reason: toOptionalString(values.changeReason),
  };

  if (!currentTask) {
    return nextValues;
  }

  const currentValues = toTaskUpdate(getTaskFormValues(currentTask), version);
  const diffValues: TaskUpdate = { version };

  TASK_UPDATE_FIELDS.forEach((field) => {
    if (!areTaskUpdateValuesEqual(nextValues[field], currentValues[field])) {
      diffValues[field] = nextValues[field] as never;
    }
  });

  if (nextValues.change_reason) {
    diffValues.change_reason = nextValues.change_reason;
  }

  return diffValues;
};

const TASK_UPDATE_FIELDS = [
  "parent_task_id",
  "task_code",
  "title",
  "description",
  "task_type",
  "status",
  "priority",
  "assignee_id",
  "reporter_id",
  "start_date",
  "due_date",
  "actual_start_date",
  "actual_end_date",
  "progress_percent",
  "estimated_minutes",
  "actual_minutes",
  "sort_order",
  "tags",
] as const satisfies readonly (keyof TaskUpdate)[];

const areTaskUpdateValuesEqual = (
  left: TaskUpdate[(typeof TASK_UPDATE_FIELDS)[number]],
  right: TaskUpdate[(typeof TASK_UPDATE_FIELDS)[number]],
) => {
  if (Array.isArray(left) || Array.isArray(right)) {
    return JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
  }

  return (left ?? null) === (right ?? null);
};

const toFormNumber = (value: number | null | undefined) => {
  return value === null || value === undefined ? "" : String(value);
};

const toOptionalNumber = (value: string) => {
  const trimmedValue = value.trim();

  return trimmedValue ? Number(trimmedValue) : null;
};

const toOptionalString = (value: string) => {
  const trimmedValue = value.trim();

  return trimmedValue || null;
};

const toTagText = (tags: string[] | null | undefined) => {
  return tags?.join(", ") ?? "";
};

const toTagArray = (value: string) => {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
};

export const TASK_LIST_COLUMNS = [
  { key: "status", label: "ステータス", initial: true },
  { key: "assignee", label: "担当者", initial: true },
  { key: "due", label: "終了予定日", initial: true },
  { key: "phase", label: "工程", initial: true },
  { key: "priority", label: "優先度", initial: true },
  { key: "start", label: "開始日", initial: false },
  { key: "progress", label: "進捗率", initial: false },
  { key: "type", label: "種別", initial: false },
  { key: "requirements", label: "関連要件", initial: false },
  { key: "tags", label: "タグ", initial: false },
] as const;

export type TaskListColumn = (typeof TASK_LIST_COLUMNS)[number]["key"];
export const DEFAULT_TASK_COLUMNS = TASK_LIST_COLUMNS.filter(
  (column) => column.initial,
).map((column) => column.key);

export function readTaskListColumns(value: string) {
  const keys = value.split(",");
  return TASK_LIST_COLUMNS.filter((column) =>
    value ? keys.includes(column.key) : column.initial,
  ).map((column) => column.key);
}

export const ALL_STATUSES = "all";
export const ALL_PRIORITIES = "all";
export const ALL_OVERDUE = "all";
export const ALL_TYPES = "all";
export const NO_BULK_STATUS_CHANGE = "no_change";
export const ALL_GANTT_FILTERS = "";

export const SORT_OPTIONS = [
  { value: "updated_desc", label: "更新日時 新しい順" },
  { value: "updated_asc", label: "更新日時 古い順" },
  { value: "code_asc", label: "タスクID 昇順" },
  { value: "code_desc", label: "タスクID 降順" },
  { value: "due_date_asc", label: "終了予定日 昇順" },
  { value: "due_date_desc", label: "終了予定日 降順" },
  { value: "progress_desc", label: "進捗率 高い順" },
] as const;

export const GANTT_DISPLAY_OPTIONS = [
  { value: "day", label: "日" },
  { value: "week", label: "週" },
  { value: "month", label: "月" },
  { value: "quarter", label: "四半期" },
] as const;

export const BOARD_SWIMLANE_OPTIONS = [
  { value: "none", label: "スイムレーンなし" },
  { value: "assignee", label: "担当者別" },
  { value: "requirement", label: "要件別" },
  { value: "parent_task", label: "親タスク別" },
  { value: "priority", label: "優先度別" },
  { value: "task_type", label: "種別別" },
] as const;

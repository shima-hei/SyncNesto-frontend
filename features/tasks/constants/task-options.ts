export const TASK_TYPE_OPTIONS = [
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "database", label: "Database" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "security", label: "Security" },
  { value: "test", label: "Test" },
  { value: "review", label: "Review" },
  { value: "investigation", label: "Investigation" },
  { value: "documentation", label: "Documentation" },
  { value: "other", label: "Other" },
] as const;

export const TASK_STATUS_OPTIONS = [
  { value: "backlog", label: "バックログ" },
  { value: "todo", label: "未着手" },
  { value: "in_progress", label: "作業中" },
  { value: "in_review", label: "レビュー中" },
  { value: "done", label: "完了" },
  { value: "blocked", label: "ブロック中" },
  { value: "cancelled", label: "中止" },
] as const;

export const TASK_PRIORITY_OPTIONS = [
  { value: "critical", label: "緊急" },
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
] as const;

export const TASK_RELATION_TYPE_OPTIONS = [
  { value: "implements", label: "実装" },
  { value: "tests", label: "テスト" },
  { value: "reviews", label: "レビュー" },
  { value: "investigates", label: "調査" },
  { value: "documents", label: "ドキュメント" },
] as const;

export const MILESTONE_STATUS_OPTIONS = [
  { value: "planned", label: "予定" },
  { value: "achieved", label: "達成" },
  { value: "missed", label: "未達" },
  { value: "cancelled", label: "中止" },
] as const;

export type TaskStatus = (typeof TASK_STATUS_OPTIONS)[number]["value"];

export const getTaskTypeLabel = (value?: string | null) => {
  return (
    TASK_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? "-"
  );
};

export const getTaskStatusLabel = (value?: string | null) => {
  return (
    TASK_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? "-"
  );
};

export const getTaskPriorityLabel = (value?: string | null) => {
  return (
    TASK_PRIORITY_OPTIONS.find((option) => option.value === value)?.label ?? "-"
  );
};

export const getTaskRelationTypeLabel = (value?: string | null) => {
  return (
    TASK_RELATION_TYPE_OPTIONS.find((option) => option.value === value)
      ?.label ??
    value ??
    "-"
  );
};

export const getMilestoneStatusLabel = (value?: string | null) => {
  return (
    MILESTONE_STATUS_OPTIONS.find((option) => option.value === value)?.label ??
    "-"
  );
};

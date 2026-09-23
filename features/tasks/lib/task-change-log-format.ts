import type { TaskChangeLogRead } from "@/lib/api/generated/model";
import {
  getChangeLogDiffRows,
  getChangeLogUpdatedFields,
  getMissingChangeLogFieldLabels,
} from "@/lib/change-log/diff";
import { formatDate } from "@/lib/format/date";

import {
  getTaskPriorityLabel,
  getTaskStatusLabel,
  getTaskTypeLabel,
  TASK_RELATION_TYPE_OPTIONS,
} from "../constants/task-options";

const ACTION_LABELS: Record<string, string> = {
  created: "作成",
  updated: "更新",
  deleted: "削除",
  status_changed: "ステータス変更",
  assignee_changed: "担当者変更",
  schedule_changed: "スケジュール変更",
  progress_changed: "進捗変更",
  comment_created: "コメント作成",
  comment_updated: "コメント更新",
  comment_deleted: "コメント削除",
  comment_resolved: "コメント解決",
  comment_reopened: "コメント再オープン",
};

const FIELD_LABELS: Record<string, string> = {
  task_code: "タスクID",
  title: "タイトル",
  description: "説明",
  status: "ステータス",
  priority: "優先度",
  task_type: "種別",
  assignee_id: "担当者",
  reporter_id: "報告者",
  start_date: "開始日",
  due_date: "期限",
  actual_start_date: "実開始日",
  actual_end_date: "実終了日",
  estimated_minutes: "見積時間",
  actual_minutes: "実績時間",
  progress_percent: "進捗",
  parent_task_id: "親タスク",
  sort_order: "並び順",
  tags: "タグ",
  requirements: "関連要件",
  body: "コメント本文",
  is_resolved: "解決状態",
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  task: "タスク",
  task_comment: "コメント",
};

const IGNORED_DIFF_FIELDS = ["task_id"];

export const formatTaskChangeLogAction = (action: string) => {
  return ACTION_LABELS[action] ?? action;
};

export const getTaskChangeLogValueDisplayMode = (
  action: string,
): "created" | "updated" | "deleted" => {
  if (action === "created" || action === "comment_created") {
    return "created";
  }

  if (action === "deleted" || action === "comment_deleted") {
    return "deleted";
  }

  return "updated";
};

export const formatTaskChangeLogField = (fieldName?: string | null) => {
  if (!fieldName) {
    return "複数項目";
  }

  return FIELD_LABELS[fieldName] ?? fieldName;
};

export const formatTaskChangeLogTargetType = (targetType?: string | null) => {
  if (!targetType) {
    return null;
  }

  return TARGET_TYPE_LABELS[targetType] ?? targetType;
};

export const formatTaskChangeLogActor = (changeLog: TaskChangeLogRead) => {
  return (
    changeLog.created_by_user?.name ??
    (changeLog.created_by ? `ユーザーID: ${changeLog.created_by}` : "-")
  );
};

export const getTaskChangeLogUpdatedFieldLabels = (
  changeLog: TaskChangeLogRead,
) => {
  if (changeLog.field_name) {
    return [];
  }

  const updatedFields = getChangeLogUpdatedFields(changeLog.new_value);

  return updatedFields.map(formatTaskChangeLogField);
};

export const getTaskChangeLogSnapshotDiffRows = (
  changeLog: TaskChangeLogRead,
) => {
  return getChangeLogDiffRows({
    oldValue: changeLog.old_value,
    newValue: changeLog.new_value,
    formatField: formatTaskChangeLogField,
    formatValue: formatTaskChangeLogValue,
    ignoredFields: IGNORED_DIFF_FIELDS,
  });
};

export const getTaskChangeLogMissingSnapshotFieldLabels = (
  changeLog: TaskChangeLogRead,
) => {
  return getMissingChangeLogFieldLabels(
    changeLog.old_value,
    changeLog.new_value,
    formatTaskChangeLogField,
  );
};

export const formatTaskChangeLogValue = (
  value: unknown,
  fieldName?: string | null,
): string => {
  if (isEmptyValue(value)) {
    return "-";
  }

  if (hasLabel(value)) {
    return value.label;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => formatTaskChangeLogValue(item, fieldName))
      .join(", ");
  }

  if (typeof value === "string") {
    return formatStringValue(value, fieldName);
  }

  if (typeof value === "number") {
    return formatNumberValue(value, fieldName);
  }

  if (typeof value === "boolean") {
    return formatBooleanValue(value, fieldName);
  }

  if (isSnapshotValue(value)) {
    const updatedFields = getChangeLogUpdatedFields(value);

    if (updatedFields.length) {
      return `変更項目: ${updatedFields.map(formatTaskChangeLogField).join("、")}`;
    }

    return "スナップショット";
  }

  return JSON.stringify(value, null, 2);
};

const formatStringValue = (value: string, fieldName?: string | null) => {
  switch (fieldName) {
    case "status":
      return getTaskStatusLabel(value);
    case "priority":
      return getTaskPriorityLabel(value);
    case "task_type":
      return getTaskTypeLabel(value);
    case "start_date":
    case "due_date":
    case "actual_start_date":
    case "actual_end_date":
      return formatDate(value);
    case "is_resolved":
      return formatBooleanValue(value === "true", fieldName);
    case "requirements":
      return getRequirementRelationLabel(value);
    default:
      return value;
  }
};

const formatNumberValue = (value: number, fieldName?: string | null) => {
  switch (fieldName) {
    case "estimated_minutes":
    case "actual_minutes":
      return `${value}分`;
    case "progress_percent":
      return `${value}%`;
    default:
      return String(value);
  }
};

const formatBooleanValue = (value: boolean, fieldName?: string | null) => {
  if (fieldName === "is_resolved") {
    return value ? "解決済み" : "未解決";
  }

  return value ? "はい" : "いいえ";
};

const getRequirementRelationLabel = (value: string) => {
  return (
    TASK_RELATION_TYPE_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  );
};

const hasLabel = (value: unknown): value is { label: string } => {
  return isRecord(value) && typeof value.label === "string";
};

const isSnapshotValue = (value: unknown) => {
  return isRecord(value) && "snapshot" in value;
};

const isEmptyValue = (value: unknown) => {
  return value === null || value === undefined || value === "";
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

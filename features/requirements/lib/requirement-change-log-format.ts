import type { RequirementChangeLogRead } from "@/lib/api/generated/model";
import {
  getChangeLogDiffRows,
  getChangeLogUpdatedFields,
  getMissingChangeLogFieldLabels,
} from "@/lib/change-log/diff";
import { formatDate } from "@/lib/format/date";

import {
  REQUIREMENT_APPROVAL_STATUS_OPTIONS,
  REQUIREMENT_DOCUMENT_STATUS_OPTIONS,
  REQUIREMENT_OPEN_ISSUE_STATUS_OPTIONS,
  REQUIREMENT_REVIEW_STATUS_OPTIONS,
  REQUIREMENT_STATUS_OPTIONS,
  getRequirementPriorityLabel,
  getRequirementTypeLabel,
} from "../constants/requirement-options";

const ACTION_LABELS: Record<string, string> = {
  created: "作成",
  updated: "更新",
  deleted: "削除",
  exported: "出力",
  sorted: "並び替え",
  promoted_to_requirement: "要件へ昇格",
  comment_created: "コメント作成",
  comment_updated: "コメント更新",
  comment_deleted: "コメント削除",
  comment_resolved: "コメント解決",
  comment_reopened: "コメント再オープン",
  approval_requested: "承認依頼",
  approval_approved: "承認",
  approval_rejected: "差し戻し",
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  requirement_document: "要件定義書",
  requirement_section: "セクション",
  requirement: "要件",
  requirement_detail: "要件詳細",
  requirement_link: "リンク",
  requirement_relation: "関連",
  requirement_review: "レビュー",
  requirement_open_issue: "未決事項",
  requirement_comment: "コメント",
};

const FIELD_LABELS: Record<string, string> = {
  title: "タイトル",
  document_code: "文書コード",
  status: "ステータス",
  purpose: "目的",
  author_id: "作成者",
  reviewer_id: "レビュー担当",
  approver_id: "承認者",
  sort_order: "並び順",
  requirement_code: "要件コード",
  requirement_type: "要件種別",
  category: "カテゴリ",
  description: "説明",
  rationale: "根拠",
  acceptance_criteria: "受け入れ条件",
  priority: "優先度",
  source: "発生源",
  owner_id: "担当者",
  issue_code: "未決事項コード",
  assignee_id: "担当者",
  due_date: "期限",
  body: "本文",
  is_resolved: "解決状態",
};

const IGNORED_DIFF_FIELDS = [
  "id",
  "project_id",
  "document_id",
  "requirement_id",
  "target_type",
  "target_id",
  "parent_comment_id",
  "version",
  "created_at",
  "updated_at",
  "deleted_at",
];

export const formatRequirementChangeLogAction = (action: string) => {
  return ACTION_LABELS[action] ?? action;
};

export const getRequirementChangeLogValueDisplayMode = (
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

export const formatRequirementChangeLogTarget = (targetType: string) => {
  return TARGET_TYPE_LABELS[targetType] ?? targetType;
};

export const formatRequirementChangeLogField = (fieldName?: string | null) => {
  if (!fieldName) {
    return "複数項目";
  }

  return FIELD_LABELS[fieldName] ?? fieldName;
};

export const formatRequirementChangeLogActor = (
  changeLog: RequirementChangeLogRead,
) => {
  return (
    changeLog.changed_by_user?.name ??
    (changeLog.changed_by ? `ユーザーID: ${changeLog.changed_by}` : "-")
  );
};

export const getRequirementChangeLogUpdatedFieldLabels = (
  changeLog: RequirementChangeLogRead,
) => {
  if (changeLog.field_name) {
    return [];
  }

  return getChangeLogUpdatedFields(changeLog.new_value).map(
    formatRequirementChangeLogField,
  );
};

export const getRequirementChangeLogDiffRows = (
  changeLog: RequirementChangeLogRead,
) => {
  return getChangeLogDiffRows({
    oldValue: changeLog.old_value,
    newValue: changeLog.new_value,
    formatField: formatRequirementChangeLogField,
    formatValue: formatRequirementChangeLogValue,
    ignoredFields: IGNORED_DIFF_FIELDS,
  });
};

export const getRequirementChangeLogMissingFieldLabels = (
  changeLog: RequirementChangeLogRead,
) => {
  return getMissingChangeLogFieldLabels(
    changeLog.old_value,
    changeLog.new_value,
    formatRequirementChangeLogField,
  );
};

export const formatRequirementChangeLogValue = (
  value: unknown,
  fieldName?: string | null,
): string => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (hasLabel(value)) {
    return value.label;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => formatRequirementChangeLogValue(item, fieldName))
      .join(", ");
  }

  if (typeof value === "string") {
    return formatStringValue(value, fieldName);
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return formatBooleanValue(value, fieldName);
  }

  if (isRecord(value) && Array.isArray(value.updated_fields)) {
    return `変更項目: ${value.updated_fields
      .filter((field): field is string => typeof field === "string")
      .map(formatRequirementChangeLogField)
      .join("、")}`;
  }

  return JSON.stringify(value, null, 2);
};

const formatStringValue = (value: string, fieldName?: string | null) => {
  switch (fieldName) {
    case "status":
      return getStatusLabel(value);
    case "priority":
      return getRequirementPriorityLabel(value);
    case "requirement_type":
      return getRequirementTypeLabel(value);
    case "due_date":
      return formatDate(value);
    case "is_resolved":
      return formatBooleanValue(value === "true", fieldName);
    default:
      return value;
  }
};

const getStatusLabel = (value: string) => {
  return (
    [
      ...REQUIREMENT_STATUS_OPTIONS,
      ...REQUIREMENT_DOCUMENT_STATUS_OPTIONS,
      ...REQUIREMENT_OPEN_ISSUE_STATUS_OPTIONS,
      ...REQUIREMENT_REVIEW_STATUS_OPTIONS,
      ...REQUIREMENT_APPROVAL_STATUS_OPTIONS,
    ].find((option) => option.value === value)?.label ?? value
  );
};

const formatBooleanValue = (value: boolean, fieldName?: string | null) => {
  if (fieldName === "is_resolved") {
    return value ? "解決済み" : "未解決";
  }

  return value ? "はい" : "いいえ";
};

const hasLabel = (value: unknown): value is { label: string } => {
  return isRecord(value) && typeof value.label === "string";
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

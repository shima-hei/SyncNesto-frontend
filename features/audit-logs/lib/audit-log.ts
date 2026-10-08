import type { ListAuditLogsTenantsCurrentAuditLogsGetParams } from "@/lib/api/generated/model";

export type AuditFilters = {
  from: string;
  to: string;
  actor: string;
  project: string;
  event: string;
};
export const EMPTY_FILTERS: AuditFilters = {
  from: "",
  to: "",
  actor: "",
  project: "",
  event: "",
};

export const EVENT_LABELS: Record<string, string> = {
  "project.created": "プロジェクト作成",
  "project.updated": "プロジェクト更新",
  "project.deleted": "プロジェクト削除",
  "project_member.added": "プロジェクトメンバー追加",
  "project_member.role_changed": "プロジェクト権限変更",
  "project_member.removed": "プロジェクトメンバー削除",
  "task.created": "タスク作成",
  "task.updated": "タスク更新",
  "task.deleted": "タスク削除",
  "document.created": "文書作成",
  "document.updated": "文書更新",
  "document.deleted": "文書削除",
  "document.restored": "文書復元",
  "document_attachment.restored": "添付ファイル復元",
  "test_design.created": "テスト設計書作成",
  "test_design.updated": "テスト設計書更新",
  "test_design.deleted": "テスト設計書削除",
  "test_design.restored": "テスト設計書復元",
  "requirement.created": "要件作成",
  "requirement.updated": "要件更新",
  "requirement.deleted": "要件削除",
  "tenant.member_added": "組織メンバー追加",
  "tenant.member_updated": "組織メンバー更新",
  "tenant.member_removed": "組織メンバー削除",
  "tenant.user_created": "組織ユーザー作成",
  "tenant.updated": "組織設定更新",
  "trash.purged": "保持期限後の完全削除",
};

export const eventLabel = (value: string) =>
  Object.hasOwn(EVENT_LABELS, value) ? EVENT_LABELS[value] : value;

const DETAIL_LABELS: Record<string, string> = {
  id: "対象ID",
  updated_fields: "更新項目",
  role_key: "権限",
  before_role_key: "変更前の権限",
  after_role_key: "変更後の権限",
  version: "版番号",
  restored_version: "復元後の版番号",
  retention_days: "保持日数",
  count: "件数",
  purged_count: "完全削除件数",
};
const VALUE_LABELS: Record<string, string> = {
  title: "タイトル",
  body: "本文",
  description: "説明",
  status: "状態",
  priority: "優先度",
  assignee_id: "担当者",
  start_date: "開始日",
  due_date: "期限",
  progress: "進捗",
  name: "名前",
  display_name: "表示名",
  department: "部署",
  position: "役職",
  role_key: "権限",
  requirement_type: "要件種別",
  parent_task_id: "親タスク",
  section_id: "セクション",
  sort_order: "表示順",
  tag: "タグ",
  tags: "タグ",
  version: "版番号",
  deleted_at: "削除日時",
  tenant_owner: "組織所有者",
  tenant_admin: "組織管理者",
  tenant_member: "組織メンバー",
  system_admin: "運営管理者",
  project_admin: "プロジェクト管理者",
  manager: "マネージャー",
  member: "メンバー",
  viewer: "閲覧者",
};
export const detailLabel = (key: string) =>
  Object.hasOwn(DETAIL_LABELS, key) ? DETAIL_LABELS[key] : key;
export const detailValue = (value: unknown): string => {
  if (Array.isArray(value)) return value.map(detailValue).join("、") || "なし";
  const text = String(value);
  return Object.hasOwn(VALUE_LABELS, text) ? VALUE_LABELS[text] : text;
};

function positiveId(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^[1-9]\d*$/.test(trimmed) || Number(trimmed) > 2147483647)
    throw new Error("IDは1〜2147483647の整数で入力してください。");
  return Number(trimmed);
}

function localDate(value: string): Date | undefined {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("日付を確認してください。");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    throw new Error("日付を確認してください。");
  return date;
}

export function auditParams(
  filters: AuditFilters,
): ListAuditLogsTenantsCurrentAuditLogsGetParams {
  const from = localDate(filters.from);
  const before = localDate(filters.to);
  if (before) before.setDate(before.getDate() + 1);
  if (from && before && from >= before)
    throw new Error("開始日は終了日以前にしてください。");
  return {
    event_type: filters.event.trim() || undefined,
    actor_user_id: positiveId(filters.actor),
    project_id: positiveId(filters.project),
    created_from: from?.toISOString(),
    created_before: before?.toISOString(),
    page: 1,
    page_size: 25,
  };
}

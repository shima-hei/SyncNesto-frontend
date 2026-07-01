export const REQUIREMENT_DOCUMENT_STATUS_OPTIONS = [
  { value: "draft", label: "下書き" },
  { value: "reviewing", label: "レビュー中" },
  { value: "approved", label: "承認済み" },
  { value: "rejected", label: "差し戻し" },
] as const;

export const REQUIREMENT_STATUS_OPTIONS = [
  { value: "draft", label: "下書き" },
  { value: "reviewing", label: "レビュー中" },
  { value: "approved", label: "承認済み" },
  { value: "rejected", label: "差し戻し" },
  { value: "implementing", label: "実装中" },
  { value: "implemented", label: "実装済み" },
  { value: "tested", label: "テスト済み" },
  { value: "on_hold", label: "保留" },
  { value: "deprecated", label: "廃止" },
] as const;

export const REQUIREMENT_PRIORITY_OPTIONS = [
  { value: "must", label: "Must" },
  { value: "should", label: "Should" },
  { value: "could", label: "Could" },
  { value: "won't", label: "Won't" },
] as const;

export const REQUIREMENT_TYPE_OPTIONS = [
  { value: "business", label: "業務要件" },
  { value: "functional", label: "機能要件" },
  { value: "non_functional", label: "非機能要件" },
  { value: "screen", label: "画面要件" },
  { value: "data", label: "データ要件" },
  { value: "role", label: "権限要件" },
  { value: "operation", label: "運用要件" },
  { value: "migration", label: "移行要件" },
  { value: "constraint", label: "制約" },
  { value: "assumption", label: "前提条件" },
  { value: "integration", label: "外部連携" },
  { value: "report", label: "帳票要件" },
] as const;

export const REQUIREMENT_LINK_TYPE_OPTIONS = [
  { value: "screen", label: "画面" },
  { value: "api", label: "API" },
  { value: "database", label: "DB" },
  { value: "task", label: "タスク" },
  { value: "test_case", label: "テストケース" },
  { value: "document", label: "ドキュメント" },
  { value: "project", label: "プロジェクト" },
] as const;

export const REQUIREMENT_RELATION_TARGET_TYPE_OPTIONS = [
  { value: "requirement_item", label: "要件" },
  { value: "section", label: "セクション" },
  { value: "open_issue", label: "未決事項" },
  { value: "document", label: "要件定義書" },
] as const;

export const REQUIREMENT_RELATION_TYPE_OPTIONS = [
  { value: "depends_on", label: "依存" },
  { value: "blocks", label: "ブロック" },
  { value: "related_to", label: "関連" },
  { value: "duplicates", label: "重複" },
] as const;

export const REQUIREMENT_REVIEW_STATUS_OPTIONS = [
  { value: "pending", label: "未レビュー" },
  { value: "approved", label: "承認" },
  { value: "rejected", label: "差し戻し" },
  { value: "commented", label: "コメント済み" },
] as const;

export const REQUIREMENT_SECTION_TYPE_OPTIONS = [
  { value: "overview", label: "概要" },
  { value: "business", label: "業務要件" },
  { value: "functional", label: "機能要件" },
  { value: "non_functional", label: "非機能要件" },
  { value: "security", label: "セキュリティ要件" },
  { value: "integration", label: "外部連携" },
  { value: "screen", label: "画面一覧" },
  { value: "data", label: "データ項目" },
  { value: "open_issue", label: "未決事項" },
] as const;

export const REQUIREMENT_OPEN_ISSUE_STATUS_OPTIONS = [
  { value: "open", label: "未着手" },
  { value: "in_review", label: "検討中" },
  { value: "resolved", label: "解決済み" },
  { value: "closed", label: "クローズ" },
] as const;

export const REQUIREMENT_APPROVAL_STATUS_OPTIONS = [
  { value: "requested", label: "承認待ち" },
  { value: "approved", label: "承認済み" },
  { value: "rejected", label: "差し戻し" },
] as const;

export const getRequirementDocumentStatusLabel = (status?: string | null) => {
  return (
    REQUIREMENT_DOCUMENT_STATUS_OPTIONS.find(
      (option) => option.value === status,
    )?.label ??
    status ??
    "-"
  );
};

export const getRequirementStatusLabel = (status?: string | null) => {
  return (
    REQUIREMENT_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ??
    status ??
    "-"
  );
};

export const getRequirementPriorityLabel = (priority?: string | null) => {
  return (
    REQUIREMENT_PRIORITY_OPTIONS.find((option) => option.value === priority)
      ?.label ??
    priority ??
    "-"
  );
};

export const getRequirementTypeLabel = (type?: string | null) => {
  return (
    REQUIREMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    type ??
    "-"
  );
};

export const getRequirementLinkTypeLabel = (type?: string | null) => {
  return (
    REQUIREMENT_LINK_TYPE_OPTIONS.find((option) => option.value === type)
      ?.label ??
    type ??
    "-"
  );
};

export const getRequirementRelationTargetTypeLabel = (type?: string | null) => {
  return (
    REQUIREMENT_RELATION_TARGET_TYPE_OPTIONS.find(
      (option) => option.value === type,
    )?.label ??
    type ??
    "-"
  );
};

export const getRequirementRelationTypeLabel = (type?: string | null) => {
  return (
    REQUIREMENT_RELATION_TYPE_OPTIONS.find((option) => option.value === type)
      ?.label ??
    type ??
    "-"
  );
};

export const getRequirementReviewStatusLabel = (status?: string | null) => {
  return (
    REQUIREMENT_REVIEW_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ??
    status ??
    "-"
  );
};

export const getRequirementSectionTypeLabel = (type?: string | null) => {
  return (
    REQUIREMENT_SECTION_TYPE_OPTIONS.find((option) => option.value === type)
      ?.label ??
    type ??
    "-"
  );
};

export const getRequirementOpenIssueStatusLabel = (status?: string | null) => {
  return (
    REQUIREMENT_OPEN_ISSUE_STATUS_OPTIONS.find(
      (option) => option.value === status,
    )?.label ??
    status ??
    "-"
  );
};

export const getRequirementApprovalStatusLabel = (status?: string | null) => {
  return (
    REQUIREMENT_APPROVAL_STATUS_OPTIONS.find(
      (option) => option.value === status,
    )?.label ??
    status ??
    "-"
  );
};

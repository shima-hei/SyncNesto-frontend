export const statusLabels: Record<string, string> = {
  requested: "判断待ち",
  approved: "合意・承認済み",
  approved_with_exceptions: "例外あり正式承認",
  rejected: "差し戻し",
  cancelled: "取消済み",
};
export const basisLabels: Record<string, string> = {
  agreed: "同じ内容に合意済み",
  unagreed: "未合意",
  pending: "判断待ち",
  rejected: "差し戻し",
  changed: "合意した内容と異なる",
  legacy_unverified: "従来履歴・対象版未確認",
  conflicting: "判断が競合",
};
export const issueLabels: Record<string, string> = {
  SUBJECT_NOT_FIXED: "当時の対象本文は固定されていません",
  ACTOR_DIFFERS_FROM_DESIGNEE: "実際の操作者が指定承認者と異なります",
  ACTOR_UNKNOWN: "実際の判断者が不明です",
  SELF_APPROVAL: "申請者と指定先が同じです",
  DECISION_LOG_MISSING: "対応する履歴が見つかりません",
  DECISION_LOG_AMBIGUOUS: "対応する履歴を一意に特定できません",
  LEGACY_TARGET_KIND: "章・未決事項の従来承認です",
  EVIDENCE_TOO_LARGE: "証拠が自動取込の容量上限を超えています",
};
export function textValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}
export function numberValue(value: unknown) {
  return typeof value === "number" ? value : 0;
}
export function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function evidenceIssues(value: unknown) {
  const issues = recordValue(value).issues;
  return Array.isArray(issues)
    ? issues
        .filter((item): item is string => typeof item === "string")
        .map((item) => issueLabels[item] ?? item)
    : [];
}
export function approvalPath(projectId: number, approvalId?: string) {
  return `/projects/joined/${projectId}/fixed-approvals${approvalId ? `/${approvalId}` : ""}`;
}

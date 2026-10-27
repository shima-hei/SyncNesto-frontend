export function evidenceText(value: unknown): string {
  return typeof value === "string" ? value : "";
}
export function evidenceRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export const evidenceStates: Record<string, string> = {
  preparing: "コピー準備中",
  ready: "保全完了",
  failed: "コピー失敗",
  cancelled: "未完コピー取消済み",
};
export const evidenceResults: Record<string, string> = {
  passed: "確認OK",
  failed: "確認NG",
  blocked: "保留",
  in_progress: "実行中",
  not_applicable: "対象外",
  inactive: "無効なパターンの記録",
};
export const evidenceKinds: Record<string, string> = {
  execution: "テスト実行",
  manual: "手動確認",
  not_applicable: "理由付き対象外",
};
export function evidenceComparison(value: unknown): string {
  return value === "same"
    ? "変更なし"
    : value === "changed"
      ? "変更あり"
      : "照合できません";
}

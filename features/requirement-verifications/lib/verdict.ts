import { safeVerificationOrigin } from "./navigation";

export const verdictLabels: Record<string, string> = {
  requested: "判定待ち",
  pending: "判定待ち",
  decided: "判定済み",
  passed: "合格",
  failed: "不合格",
  not_applicable: "対象外",
  cancelled: "依頼取消",
  withdrawn: "判断撤回",
  not_judged: "未判定",
  requires_reassessment: "再判定が必要",
  not_evaluated: "照合できません",
  restricted: "閲覧制限",
  conflict: "判断の確認が必要",
  judge_unavailable: "担当の再指定が必要",
};

export const verdictIssues: Record<string, string> = {
  adverse_evidence: "NG・保留の根拠があります",
  conflicting_evidence: "根拠が相反しています",
  no_targets: "確認対象がありません",
  missing_target: "対象ケースが不足しています",
  missing_or_conflicting_execution: "実行結果が不足・重複しています",
  execution_changed: "現在のテスト内容・実行と一致しません",
  unresolved_execution: "未実施・NG・保留、または対象外の理由不足",
  missing_or_unresolved_confirmation: "手動確認が不足・未解決です",
};

export function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (v): v is Record<string, unknown> =>
          v !== null && typeof v === "object" && !Array.isArray(v),
      )
    : [];
}
export function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}
export function label(value: unknown): string {
  return typeof value === "string" ? value : "";
}
export function verdictHref(
  projectId: number,
  requestId: string,
  from: string,
  rowId?: string | null,
) {
  const params = new URLSearchParams({
    from: safeVerificationOrigin(from, projectId),
  });
  if (rowId && /^[0-9a-f-]{36}$/i.test(rowId)) params.set("row", rowId);
  return `/projects/joined/${projectId}/requirement-verdicts/${requestId}?${params}`;
}

import type { RequirementAgreementPage } from "@/lib/api/generated/model";

export function agreementDisplay(
  query: {
    isPending: boolean;
    isFetching: boolean;
    isError: boolean;
    data?: RequirementAgreementPage;
  },
  requirementId: number,
  version: number,
) {
  if (query.isPending || query.isFetching) return { kind: "loading" as const };
  if (query.isError || !query.data)
    return {
      kind: "error" as const,
      message: "合意状況を取得できません。更新して再確認してください。",
    };
  if (query.data.state === "disabled")
    return {
      kind: "disabled" as const,
      message: "現在内容への合意は未集計です。",
    };
  if (query.data.state === "restricted")
    return {
      kind: "restricted" as const,
      message: "合意状況を確認する閲覧権限が必要です。",
    };
  const row = query.data.items?.find((r) => r.requirement_id === requirementId);
  if (!row)
    return {
      kind: "unavailable" as const,
      message: "この要件の合意を確認できません。",
    };
  if (row.version !== version)
    return {
      kind: "stale" as const,
      message: "要件が更新されています。要件の表示も更新して確認してください。",
    };
  return { kind: "ready" as const, row };
}

import type { RequirementWorkflowRead } from "@/lib/api/generated/model";

export const reviewRequestStatus: Record<
  RequirementWorkflowRead["status"],
  string
> = {
  requested: "レビュー中",
  completed: "レビュー完了",
  changes_requested: "修正依頼あり",
  cancelled: "取消済み",
  approved: "承認済み",
  returned: "差し戻し",
};

export const reviewItemStatus = {
  pending: "未確認",
  confirmed: "確認済み",
  changes_requested: "要修正",
};

export const correctionStatus = {
  open: "未対応",
  in_progress: "対応中",
  awaiting_confirmation: "再確認待ち",
  resolved: "解決済み",
};

export function requirementWorkflowHref(
  projectId: number,
  requestId: string,
  target?: { nodeId: string; threadId: string },
) {
  const path = `/projects/joined/${projectId}/requirement-workflow/${requestId}`;
  if (!target) return path;
  const query = new URLSearchParams({
    node: target.nodeId,
    thread: target.threadId,
  });
  return `${path}?${query}`;
}

export const reviewTargetKind: Record<string, string> = {
  requirement_document: "要件定義書",
  section: "章",
  requirement: "要件",
  specification: "設計書",
  test_design: "テスト設計書",
};

export function reviewTargetTitle(node: {
  node_kind: string;
  payload: Record<string, unknown>;
}) {
  return (
    (typeof node.payload.title === "string" && node.payload.title) ||
    reviewTargetKind[node.node_kind] ||
    "レビュー対象"
  );
}

export const approvalKindLabels: Record<string, string> = {
  requirement: "個別要件の合意",
  requirement_document: "要件定義書の正式承認",
  specification: "画面・API設計の承認",
  test_design: "テスト設計書の承認",
};

export const approvalActionLabels: Record<string, string> = {
  requirement: "この要件に合意する",
  requirement_document: "この要件定義書を正式承認する",
  specification: "この画面・API設計を承認する",
  test_design: "このテスト設計を承認する",
};

export function sharedApprovalPath(publicationId: string, approvalId: string) {
  return `/shared/publications/${publicationId}/approval-requests/${approvalId}`;
}

import type { RequirementDocumentFormValues } from "../types/requirement-document-form";

export const REQUIREMENT_DOCUMENT_CONFLICT_FIELD_LABELS = {
  title: "タイトル",
  documentCode: "ドキュメントコード",
  status: "ステータス",
  purpose: "目的",
  targetSystemName: "対象システム",
  clientName: "クライアント",
  vendorName: "ベンダー",
  authorId: "作成者ID",
  reviewerId: "レビュー担当ID",
  approverId: "承認者ID",
  approvedAt: "承認日時",
} satisfies Partial<Record<keyof RequirementDocumentFormValues, string>>;

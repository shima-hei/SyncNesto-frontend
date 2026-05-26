import type { RequirementDocumentFormValues } from "../types/requirement-document-form";
import type { RequirementFormValues } from "../types/requirement-form";

export const REQUIREMENT_CONFLICT_FIELD_LABELS = {
  requirementCode: "要件コード",
  requirementType: "種別",
  category: "カテゴリ",
  title: "タイトル",
  description: "説明",
  rationale: "理由",
  acceptanceCriteria: "受け入れ条件",
  priority: "優先度",
  status: "ステータス",
  source: "情報源",
  ownerId: "担当者ID",
  approvedBy: "承認者ID",
  approvedAt: "承認日時",
  changeSummary: "変更概要",
  reason: "変更理由",
} satisfies Partial<Record<keyof RequirementFormValues, string>>;

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

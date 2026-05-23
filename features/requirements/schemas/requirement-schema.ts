import { z } from "zod";

export const requirementDocumentSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください。"),
  documentCode: z.string().min(1, "ドキュメントコードを入力してください。"),
  status: z.string().min(1, "ステータスを選択してください。"),
  purpose: z.string(),
  targetSystemName: z.string(),
  clientName: z.string(),
  vendorName: z.string(),
  authorId: z.string(),
  reviewerId: z.string(),
  approverId: z.string(),
  approvedAt: z.string(),
});

export const requirementSchema = z.object({
  requirementCode: z.string().min(1, "要件コードを入力してください。"),
  requirementType: z.string().min(1, "種別を選択してください。"),
  category: z.string(),
  title: z.string().min(1, "タイトルを入力してください。"),
  description: z.string(),
  rationale: z.string(),
  acceptanceCriteria: z.string(),
  priority: z.string().min(1, "優先度を選択してください。"),
  status: z.string().min(1, "ステータスを選択してください。"),
  source: z.string(),
  ownerId: z.string(),
  approvedBy: z.string(),
  approvedAt: z.string(),
  changeSummary: z.string(),
  reason: z.string(),
});

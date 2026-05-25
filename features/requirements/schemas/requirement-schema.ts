import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/lib/messages/validation-message";

export const requirementDocumentSchema = z.object({
  title: z.string().min(1, VALIDATION_MESSAGES.required("タイトル")),
  documentCode: z
    .string()
    .min(1, VALIDATION_MESSAGES.required("ドキュメントコード")),
  status: z.string().min(1, VALIDATION_MESSAGES.selectRequired("ステータス")),
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
  requirementCode: z.string().min(1, VALIDATION_MESSAGES.required("要件コード")),
  requirementType: z.string().min(1, VALIDATION_MESSAGES.selectRequired("種別")),
  category: z.string(),
  title: z.string().min(1, VALIDATION_MESSAGES.required("タイトル")),
  description: z.string(),
  rationale: z.string(),
  acceptanceCriteria: z.string(),
  priority: z.string().min(1, VALIDATION_MESSAGES.selectRequired("優先度")),
  status: z.string().min(1, VALIDATION_MESSAGES.selectRequired("ステータス")),
  source: z.string(),
  ownerId: z.string(),
  approvedBy: z.string(),
  approvedAt: z.string(),
  changeSummary: z.string(),
  reason: z.string(),
});

export const requirementCommentSchema = z.object({
  comment: z.string().min(1, VALIDATION_MESSAGES.required("コメント")),
});

export const requirementLinkSchema = z.object({
  linkedType: z.string().min(1, VALIDATION_MESSAGES.selectRequired("リンク種別")),
  linkedId: z.string().min(1, VALIDATION_MESSAGES.required("リンク先ID")),
});

export const requirementReviewSchema = z.object({
  reviewerId: z
    .string()
    .min(1, VALIDATION_MESSAGES.required("レビュー担当ID"))
    .refine((value) => Number.isInteger(Number(value)), {
      message: VALIDATION_MESSAGES.number("レビュー担当ID"),
    }),
  status: z.string().min(1, VALIDATION_MESSAGES.selectRequired("ステータス")),
  comment: z.string(),
  reviewedAt: z.string(),
});

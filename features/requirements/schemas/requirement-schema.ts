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
  sectionId: z.string(),
  requirementCode: z.string(),
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

export const requirementRelationSchema = z.object({
  targetType: z.string().min(1, VALIDATION_MESSAGES.selectRequired("対象種別")),
  targetId: z.string().min(1, VALIDATION_MESSAGES.required("対象ID")),
  relationType: z.string().min(1, VALIDATION_MESSAGES.selectRequired("関連種別")),
  description: z.string(),
});

export const requirementTargetCommentSchema = z.object({
  body: z.string().min(1, VALIDATION_MESSAGES.required("コメント")),
  reason: z.string(),
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

export const requirementSectionSchema = z.object({
  title: z.string().min(1, VALIDATION_MESSAGES.required("セクション名")),
  sectionType: z.string().min(1, VALIDATION_MESSAGES.selectRequired("種別")),
  content: z.string(),
  sortOrder: z
    .string()
    .min(1, VALIDATION_MESSAGES.required("表示順"))
    .refine((value) => Number.isInteger(Number(value)), {
      message: VALIDATION_MESSAGES.number("表示順"),
    }),
  status: z.string().min(1, VALIDATION_MESSAGES.selectRequired("ステータス")),
});

export const requirementOpenIssueSchema = z.object({
  issueCode: z.string(),
  title: z.string().min(1, VALIDATION_MESSAGES.required("論点")),
  description: z.string(),
  impactScope: z.string(),
  relatedRequirementId: z
    .string()
    .refine(
      (value) => !value || Number.isInteger(Number(value)),
      VALIDATION_MESSAGES.number("関連要件ID")
    ),
  assigneeId: z.string(),
  dueDate: z.string(),
  status: z.string().min(1, VALIDATION_MESSAGES.selectRequired("ステータス")),
  resolution: z.string(),
  reason: z.string(),
});

export const requirementApprovalRequestSchema = z.object({
  approverId: z
    .string()
    .min(1, VALIDATION_MESSAGES.required("承認者ID"))
    .refine((value) => Number.isInteger(Number(value)), {
      message: VALIDATION_MESSAGES.number("承認者ID"),
    }),
  comment: z.string(),
});

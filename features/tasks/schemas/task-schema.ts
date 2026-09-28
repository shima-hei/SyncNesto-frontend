import { commentMentionsSchema } from "@/lib/comments/mentions";
import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/lib/messages/validation-message";

const optionalPositiveInteger = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => !value || /^\d+$/.test(value), {
      message: VALIDATION_MESSAGES.number(label),
    });

const optionalNonNegativeNumber = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => !value || Number(value) >= 0, {
      message: VALIDATION_MESSAGES.number(label),
    });

export const taskSchema = z.object({
  taskCode: z.string().trim(),
  title: z.string().trim().min(1, VALIDATION_MESSAGES.required("タイトル")),
  description: z.string(),
  taskType: z.string().min(1, VALIDATION_MESSAGES.selectRequired("種別")),
  status: z.string().min(1, VALIDATION_MESSAGES.selectRequired("ステータス")),
  priority: z.string().min(1, VALIDATION_MESSAGES.selectRequired("優先度")),
  assigneeId: optionalPositiveInteger("担当者"),
  reporterId: optionalPositiveInteger("報告者"),
  startDate: z.string(),
  dueDate: z.string(),
  actualStartDate: z.string(),
  actualEndDate: z.string(),
  progressPercent: z
    .string()
    .trim()
    .refine((value) => value === "" || !Number.isNaN(Number(value)), {
      message: VALIDATION_MESSAGES.number("進捗率"),
    })
    .refine((value) => {
      if (value === "") {
        return true;
      }

      const progress = Number(value);

      return progress >= 0 && progress <= 100;
    }, "進捗率は0から100の範囲で入力してください。"),
  estimatedMinutes: optionalNonNegativeNumber("見積時間"),
  actualMinutes: optionalNonNegativeNumber("実績時間"),
  parentTaskId: optionalPositiveInteger("親タスク"),
  requirementId: optionalPositiveInteger("関連要件"),
  relationType: z.string(),
  tags: z.string(),
  sortOrder: optionalNonNegativeNumber("並び順"),
  changeReason: z.string(),
});

export const taskCommentSchema = z.object({
  mentions: commentMentionsSchema.optional(),
  body: z
    .string()
    .refine(
      (value) => value.trim().length > 0,
      VALIDATION_MESSAGES.required("コメント"),
    ),
  status: z.string(),
});

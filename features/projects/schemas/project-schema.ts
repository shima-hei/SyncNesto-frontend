import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/lib/messages/validation-message";

export const projectSchema = z.object({
  projectCode: z.string().min(1, VALIDATION_MESSAGES.required("プロジェクトコード")),
  name: z.string().min(1, VALIDATION_MESSAGES.required("プロジェクト名")),
  description: z.string(),
  status: z.string().min(1, VALIDATION_MESSAGES.selectRequired("ステータス")),
  startDate: z.string(),
  endDate: z.string(),
});

export const projectMemberSchema = z.object({
  userId: z
    .number(VALIDATION_MESSAGES.selectRequired("ユーザー"))
    .int(VALIDATION_MESSAGES.selectRequired("ユーザー"))
    .positive(VALIDATION_MESSAGES.selectRequired("ユーザー")),
  roleKey: z.string().min(1, VALIDATION_MESSAGES.selectRequired("権限")),
});

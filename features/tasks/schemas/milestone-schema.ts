import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/lib/messages/validation-message";

export const milestoneSchema = z.object({
  title: z.string().trim().min(1, VALIDATION_MESSAGES.required("タイトル")),
  description: z.string(),
  targetDate: z.string().trim().min(1, VALIDATION_MESSAGES.required("目標日")),
  status: z.string().min(1, VALIDATION_MESSAGES.selectRequired("ステータス")),
});

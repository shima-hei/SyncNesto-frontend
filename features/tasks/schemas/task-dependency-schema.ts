import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/lib/messages/validation-message";

export const taskDependencySchema = z.object({
  predecessorTaskId: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.required("依存元タスク"))
    .regex(/^\d+$/, VALIDATION_MESSAGES.number("依存元タスク")),
  successorTaskId: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.required("依存先タスク"))
    .regex(/^\d+$/, VALIDATION_MESSAGES.number("依存先タスク")),
  lagDays: z
    .string()
    .trim()
    .refine((value) => !value || Number(value) >= 0, {
      message: VALIDATION_MESSAGES.number("ラグ日数"),
    }),
});

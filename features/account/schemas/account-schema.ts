import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/lib/messages/validation-message";

export const accountProfileSchema = z.object({
  name: z.string().min(1, VALIDATION_MESSAGES.required("名前")),
  password: z
    .string()
    .refine(
      (value) => value.length === 0 || value.length >= 8,
      VALIDATION_MESSAGES.optionalMinLength("パスワード", 8)
    ),
});

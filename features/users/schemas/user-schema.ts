import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/lib/messages/validation-message";

export const userCreateSchema = z.object({
  email: z.string().email(VALIDATION_MESSAGES.email),
  name: z.string().min(1, VALIDATION_MESSAGES.required("名前")),
  password: z.string().min(8, VALIDATION_MESSAGES.minLength("パスワード", 8)),
  department: z.string(),
  position: z.string(),
  isActive: z.boolean(),
  isSystemAdmin: z.boolean(),
});

export const userUpdateSchema = userCreateSchema.extend({
  password: z
    .string()
    .refine(
      (value) => value.length === 0 || value.length >= 8,
      VALIDATION_MESSAGES.optionalMinLength("パスワード", 8)
    ),
});

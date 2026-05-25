import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/lib/messages/validation-message";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.required("メールアドレス"))
    .email(VALIDATION_MESSAGES.emailInvalid),
  password: z.string().min(1, VALIDATION_MESSAGES.required("パスワード")),
});

import { z } from "zod";
import { VALIDATION_MESSAGES } from "@/lib/messages/validation-message";

export const accountActionEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.required("メールアドレス"))
    .email(VALIDATION_MESSAGES.email)
    .max(255, VALIDATION_MESSAGES.maxLength("メールアドレス", 255)),
});

export const passwordResetSchema = z
  .object({
    password: z
      .string()
      .min(12, VALIDATION_MESSAGES.minLength("パスワード", 12))
      .max(128, VALIDATION_MESSAGES.maxLength("パスワード", 128)),
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: VALIDATION_MESSAGES.passwordConfirmation,
  });

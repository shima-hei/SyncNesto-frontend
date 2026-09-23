import { z } from "zod";

import { USER_TYPE_KEYS } from "@/features/auth/constants/roles";
import { VALIDATION_MESSAGES } from "@/lib/messages/validation-message";

const userTypeSchema = z.enum([USER_TYPE_KEYS.internal, USER_TYPE_KEYS.guest]);

const userFormBaseSchema = z.object({
  email: z.string().email(VALIDATION_MESSAGES.email),
  name: z.string().min(1, VALIDATION_MESSAGES.required("名前")),
  password: z.string().min(8, VALIDATION_MESSAGES.minLength("パスワード", 8)),
  department: z.string(),
  position: z.string(),
  userType: userTypeSchema,
  isActive: z.boolean(),
  isSystemAdmin: z.boolean(),
});

const validateGuestSystemAdmin = {
  message: "ゲストにシステム管理者は付与できません。",
  path: ["isSystemAdmin"],
};

export const userCreateSchema = userFormBaseSchema.refine(
  (values) => values.userType !== USER_TYPE_KEYS.guest || !values.isSystemAdmin,
  validateGuestSystemAdmin,
);

export const userUpdateSchema = userFormBaseSchema
  .extend({
    password: z
      .string()
      .refine(
        (value) => value.length === 0 || value.length >= 8,
        VALIDATION_MESSAGES.optionalMinLength("パスワード", 8),
      ),
  })
  .refine(
    (values) =>
      values.userType !== USER_TYPE_KEYS.guest || !values.isSystemAdmin,
    validateGuestSystemAdmin,
  );

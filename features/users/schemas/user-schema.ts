import { z } from "zod";

export const userCreateSchema = z.object({
  email: z.string().email("メールアドレスの形式で入力してください。"),
  name: z.string().min(1, "名前を入力してください。"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください。"),
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
      "パスワードを変更する場合は8文字以上で入力してください。"
    ),
});

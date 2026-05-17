import { z } from "zod";

export const accountProfileSchema = z.object({
  name: z.string().min(1, "名前を入力してください。"),
  password: z
    .string()
    .refine(
      (value) => value.length === 0 || value.length >= 8,
      "パスワードを変更する場合は8文字以上で入力してください。"
    ),
});


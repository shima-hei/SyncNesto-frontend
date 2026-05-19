import { z } from "zod";

export const projectSchema = z.object({
  projectCode: z.string().min(1, "プロジェクトコードを入力してください。"),
  name: z.string().min(1, "プロジェクト名を入力してください。"),
  description: z.string(),
  status: z.string().min(1, "ステータスを選択してください。"),
  startDate: z.string(),
  endDate: z.string(),
});

export const projectMemberSchema = z.object({
  userId: z
    .string()
    .min(1, "ユーザーIDを入力してください。")
    .refine((value) => Number.isInteger(Number(value)) && Number(value) > 0, {
      message: "ユーザーIDは1以上の整数で入力してください。",
    }),
  roleKey: z.string().min(1, "権限を選択してください。"),
});

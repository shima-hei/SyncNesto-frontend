import type { UserFormValues } from "../types/user-form";

export const USER_CONFLICT_FIELD_LABELS = {
  email: "メールアドレス",
  name: "名前",
  password: "パスワード",
  department: "部署",
  position: "役職",
  isActive: "有効ユーザー",
  isSystemAdmin: "システム管理者",
} satisfies Partial<Record<keyof UserFormValues, string>>;

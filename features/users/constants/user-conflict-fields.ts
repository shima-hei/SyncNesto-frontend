import type { UserFormValues } from "../types/user-form";
import { getUserTypeLabel } from "./user-types";

export const USER_CONFLICT_FIELD_LABELS = {
  email: "メールアドレス",
  name: "名前",
  password: "パスワード",
  department: "部署",
  position: "役職",
  userType: "ユーザー区分",
  isActive: "有効ユーザー",
  isSystemAdmin: "システム管理者",
} satisfies Partial<Record<keyof UserFormValues, string>>;

export const USER_CONFLICT_VALUE_FORMATTERS = {
  userType: (value: unknown) =>
    typeof value === "string" ? getUserTypeLabel(value) : "-",
  isActive: (value: unknown) => (value ? "有効" : "無効"),
  isSystemAdmin: (value: unknown) => (value ? "付与する" : "付与しない"),
} satisfies Partial<Record<keyof UserFormValues, (value: unknown) => string>>;

import type { AccountProfileFormValues } from "../types/account-form";

export const ACCOUNT_PROFILE_CONFLICT_FIELD_LABELS = {
  name: "名前",
  password: "パスワード",
} satisfies Partial<Record<keyof AccountProfileFormValues, string>>;

import type { AccountProfileFormValues } from "../types/account-form";

export const ACCOUNT_PROFILE_CONFLICT_FIELD_LABELS = {
  name: "名前",
} satisfies Partial<Record<keyof AccountProfileFormValues, string>>;

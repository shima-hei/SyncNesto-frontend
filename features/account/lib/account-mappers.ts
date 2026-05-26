import type { UserProfileUpdate } from "@/lib/api/generated/model";

import type { AccountProfileFormValues } from "../types/account-form";

export const toUserProfileUpdate = (
  values: AccountProfileFormValues,
  version: number
): UserProfileUpdate => {
  return {
    version,
    name: values.name,
    password: values.password || null,
  };
};

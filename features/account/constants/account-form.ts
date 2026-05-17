import type { CurrentUserRead } from "@/lib/api/generated/model";

import type { AccountProfileFormValues } from "../types/account-form";

export const getAccountProfileFormValues = (
  user: CurrentUserRead
): AccountProfileFormValues => {
  return {
    name: user.name,
    password: "",
  };
};


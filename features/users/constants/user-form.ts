import type { UserRead } from "@/lib/api/generated/model";

import { SYSTEM_ROLE_KEYS } from "@/features/auth/constants/roles";

import type { UserFormValues } from "../types/user-form";

export const userInitialValues: UserFormValues = {
  email: "",
  name: "",
  password: "",
  department: "",
  position: "",
  isActive: true,
  isSystemAdmin: false,
};

export const getUserFormValues = (user: UserRead): UserFormValues => {
  return {
    email: user.email,
    name: user.name,
    password: "",
    department: user.department ?? "",
    position: user.position ?? "",
    isActive: user.is_active,
    isSystemAdmin:
      user.system_roles?.some(
        (role) => role.key === SYSTEM_ROLE_KEYS.systemAdmin
      ) ?? false,
  };
};

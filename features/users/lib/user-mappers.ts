import { SYSTEM_ROLE_KEYS } from "@/features/auth/constants/roles";
import type { UserCreate, UserUpdate } from "@/lib/api/generated/model";

import type { UserFormValues } from "../types/user-form";

export const toUserCreate = (values: UserFormValues): UserCreate => {
  return {
    email: values.email,
    name: values.name,
    password: values.password,
    department: values.department || null,
    position: values.position || null,
    is_active: values.isActive,
    system_role_keys: toSystemRoleKeys(values),
  };
};

export const toUserUpdate = (
  values: UserFormValues,
  version: number
): UserUpdate => {
  return {
    version,
    email: values.email,
    name: values.name,
    password: values.password || null,
    department: values.department || null,
    position: values.position || null,
    is_active: values.isActive,
    system_role_keys: toSystemRoleKeys(values),
  };
};

const toSystemRoleKeys = (values: UserFormValues) => {
  return values.isSystemAdmin ? [SYSTEM_ROLE_KEYS.systemAdmin] : [];
};

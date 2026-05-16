import type { CurrentUserRead } from "@/lib/api/generated/model";

import {
  PROJECT_ROLE_KEYS,
  SYSTEM_ROLE_KEYS,
  type ProjectRoleKey,
  type SystemRoleKey,
} from "../constants/roles";

type MaybeCurrentUser = CurrentUserRead | null | undefined;

export const hasSystemRole = (
  user: MaybeCurrentUser,
  roleKey: SystemRoleKey
) => {
  return user?.system_roles.some((role) => role.key === roleKey) ?? false;
};

export const hasAnySystemRole = (
  user: MaybeCurrentUser,
  roleKeys: readonly SystemRoleKey[]
) => {
  return roleKeys.some((roleKey) => hasSystemRole(user, roleKey));
};

export const isSystemAdmin = (user: MaybeCurrentUser) => {
  return hasSystemRole(user, SYSTEM_ROLE_KEYS.systemAdmin);
};

export const hasProjectRole = (
  roleKey: ProjectRoleKey | null | undefined,
  allowedRoleKeys: readonly ProjectRoleKey[]
) => {
  return Boolean(roleKey && allowedRoleKeys.includes(roleKey));
};

export const canManageProject = (roleKey: ProjectRoleKey | null | undefined) => {
  return hasProjectRole(roleKey, [PROJECT_ROLE_KEYS.projectAdmin]);
};

export const canEditProject = (roleKey: ProjectRoleKey | null | undefined) => {
  return hasProjectRole(roleKey, [PROJECT_ROLE_KEYS.projectAdmin]);
};

export const canViewProject = (roleKey: ProjectRoleKey | null | undefined) => {
  return hasProjectRole(roleKey, [
    PROJECT_ROLE_KEYS.projectAdmin,
    PROJECT_ROLE_KEYS.manager,
    PROJECT_ROLE_KEYS.member,
    PROJECT_ROLE_KEYS.viewer,
  ]);
};


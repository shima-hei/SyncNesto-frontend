import type { CurrentUserRead } from "@/lib/api/generated/model";
import type { CurrentProjectRoleRead } from "@/lib/api/generated/model";

import {
  PROJECT_ROLE_KEYS,
  SYSTEM_ROLE_KEYS,
  type ProjectRoleKey,
  type SystemRoleKey,
} from "../constants/roles";

type MaybeCurrentUser = CurrentUserRead | null | undefined;
type MaybeCurrentProjectRole = CurrentProjectRoleRead | null | undefined;

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

export const canViewRequirement = (role: MaybeCurrentProjectRole) => {
  return (
    role?.is_system_admin === true ||
    hasProjectRole(toProjectRoleKey(role), [
      PROJECT_ROLE_KEYS.projectAdmin,
      PROJECT_ROLE_KEYS.manager,
      PROJECT_ROLE_KEYS.member,
      PROJECT_ROLE_KEYS.viewer,
    ])
  );
};

export const canCreateRequirement = (role: MaybeCurrentProjectRole) => {
  return (
    role?.is_system_admin === true ||
    hasProjectRole(toProjectRoleKey(role), [
      PROJECT_ROLE_KEYS.projectAdmin,
      PROJECT_ROLE_KEYS.manager,
      PROJECT_ROLE_KEYS.member,
    ])
  );
};

export const canUpdateRequirement = canCreateRequirement;

export const canDeleteRequirement = (role: MaybeCurrentProjectRole) => {
  return (
    role?.is_system_admin === true ||
    hasProjectRole(toProjectRoleKey(role), [PROJECT_ROLE_KEYS.projectAdmin])
  );
};

export const canCommentRequirement = canCreateRequirement;

export const canReviewRequirement = (role: MaybeCurrentProjectRole) => {
  return (
    role?.is_system_admin === true ||
    hasProjectRole(toProjectRoleKey(role), [
      PROJECT_ROLE_KEYS.projectAdmin,
      PROJECT_ROLE_KEYS.manager,
    ])
  );
};

export const canLinkRequirement = canCreateRequirement;

export const canApproveRequirement = canDeleteRequirement;

const toProjectRoleKey = (
  role: MaybeCurrentProjectRole
): ProjectRoleKey | null => {
  const roleKey = role?.role?.key;

  if (isProjectRoleKey(roleKey)) {
    return roleKey;
  }

  return null;
};

const isProjectRoleKey = (roleKey: string | undefined): roleKey is ProjectRoleKey => {
  return Object.values(PROJECT_ROLE_KEYS).some((value) => value === roleKey);
};

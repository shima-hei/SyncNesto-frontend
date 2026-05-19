import { PROJECT_ROLE_KEYS } from "@/features/auth/constants/roles";

export const PROJECT_ROLE_OPTIONS = [
  {
    value: PROJECT_ROLE_KEYS.projectAdmin,
    label: "プロジェクト管理者",
  },
  {
    value: PROJECT_ROLE_KEYS.manager,
    label: "マネージャー",
  },
  {
    value: PROJECT_ROLE_KEYS.member,
    label: "メンバー",
  },
  {
    value: PROJECT_ROLE_KEYS.viewer,
    label: "閲覧者",
  },
] as const;

export const getProjectRoleLabel = (roleKey?: string | null) => {
  return (
    PROJECT_ROLE_OPTIONS.find((option) => option.value === roleKey)?.label ??
    roleKey ??
    "-"
  );
};

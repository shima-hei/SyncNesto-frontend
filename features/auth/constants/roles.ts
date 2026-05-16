// UI分岐では表示名やDB IDではなく、安定したrole keyを使う。
export const SYSTEM_ROLE_KEYS = {
  systemAdmin: "system_admin",
} as const;

export const PROJECT_ROLE_KEYS = {
  projectAdmin: "project_admin",
  manager: "manager",
  member: "member",
  viewer: "viewer",
} as const;

export type SystemRoleKey =
  (typeof SYSTEM_ROLE_KEYS)[keyof typeof SYSTEM_ROLE_KEYS];

export type ProjectRoleKey =
  (typeof PROJECT_ROLE_KEYS)[keyof typeof PROJECT_ROLE_KEYS];

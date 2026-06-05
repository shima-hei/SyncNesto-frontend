import type { CurrentProjectRoleRead } from "@/lib/api/generated/model";
import { canViewProjectFeature } from "@/features/auth/utils/authorization";

export type JoinedProjectNavigationItem = {
  label: string;
  href: (projectId: number) => string;
  canShow: (role: CurrentProjectRoleRead | null) => boolean;
};

export const joinedProjectNavigationItems: JoinedProjectNavigationItem[] = [
  {
    label: "概要",
    href: (projectId) => `/projects/joined/${projectId}`,
    canShow: canViewProjectFeature,
  },
  {
    label: "メンバー",
    href: (projectId) => `/projects/joined/${projectId}/members`,
    canShow: canViewProjectFeature,
  },
  {
    label: "要件定義書",
    href: (projectId) => `/projects/joined/${projectId}/requirements`,
    canShow: canViewProjectFeature,
  },
  {
    label: "タスク",
    href: (projectId) => `/projects/joined/${projectId}/tasks`,
    canShow: canViewProjectFeature,
  },
  {
    label: "テスト設計書",
    href: (projectId) => `/projects/joined/${projectId}/test-designs`,
    canShow: canViewProjectFeature,
  },
  {
    label: "テストケース",
    href: (projectId) => `/projects/joined/${projectId}/test-cases`,
    canShow: canViewProjectFeature,
  },
  {
    label: "ドキュメント",
    href: (projectId) => `/projects/joined/${projectId}/documents`,
    canShow: canViewProjectFeature,
  },
];

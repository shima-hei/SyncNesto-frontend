import {
  CircleHelpIcon,
  FolderKanbanIcon,
  HomeIcon,
  SettingsIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import { SYSTEM_ROLE_KEYS } from "@/features/auth/constants/roles";
import type { SystemRoleKey } from "@/features/auth/constants/roles";

export type AppNavigationItem = {
  title: string;
  href?: string;
  icon: LucideIcon;
  requiredSystemRoles?: readonly SystemRoleKey[];
  children?: AppNavigationChildItem[];
};

export type AppNavigationChildItem = {
  title: string;
  href: string;
  icon?: LucideIcon;
  requiredSystemRoles?: readonly SystemRoleKey[];
};

export const mainNavigation: AppNavigationItem[] = [
  {
    title: "ホーム",
    href: "/",
    icon: HomeIcon,
  },
  {
    title: "プロジェクト",
    href: "/projects/joined",
    icon: FolderKanbanIcon,
  },
];

export const managementNavigation: AppNavigationItem[] = [
  {
    title: "プロジェクト管理",
    href: "/projects/management",
    icon: SettingsIcon,
    requiredSystemRoles: [SYSTEM_ROLE_KEYS.systemAdmin],
  },
  {
    title: "ユーザー管理",
    href: "/system/users",
    icon: UsersIcon,
    requiredSystemRoles: [SYSTEM_ROLE_KEYS.systemAdmin],
  },
];

export const secondaryNavigation: AppNavigationItem[] = [
  {
    title: "ヘルプ",
    href: "/help",
    icon: CircleHelpIcon,
  },
];

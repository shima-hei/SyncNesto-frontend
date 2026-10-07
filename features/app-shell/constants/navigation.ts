import {
  CircleHelpIcon,
  FolderKanbanIcon,
  HomeIcon,
  SearchIcon,
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
    title: "横断検索",
    href: "/search",
    icon: SearchIcon,
  },
  {
    title: "プロジェクト",
    href: "/projects/joined",
    icon: FolderKanbanIcon,
  },
];

export const managementNavigation: AppNavigationItem[] = [
  {
    title: "組織の運営管理",
    href: "/system/tenants",
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

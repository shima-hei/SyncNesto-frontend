import {
  FolderKanbanIcon,
  HomeIcon,
  ListTodoIcon,
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
    title: "案件",
    href: "/projects/joined",
    icon: FolderKanbanIcon,
  },
  {
    title: "自分の作業",
    href: "/#my-work",
    icon: ListTodoIcon,
  },
  {
    title: "検索",
    href: "/search",
    icon: SearchIcon,
  },
];

export const managementNavigation: AppNavigationItem[] = [
  {
    title: "管理ホーム",
    href: "/system",
    icon: HomeIcon,
    requiredSystemRoles: [SYSTEM_ROLE_KEYS.systemAdmin],
  },
  {
    title: "全体の組織管理",
    href: "/system/tenants",
    icon: SettingsIcon,
    requiredSystemRoles: [SYSTEM_ROLE_KEYS.systemAdmin],
  },
  {
    title: "全体のユーザー管理",
    href: "/system/users",
    icon: UsersIcon,
    requiredSystemRoles: [SYSTEM_ROLE_KEYS.systemAdmin],
  },
];

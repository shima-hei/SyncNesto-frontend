import {
  CircleHelpIcon,
  HomeIcon,
  Settings2Icon,
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
    title: "システム設定",
    icon: Settings2Icon,
    requiredSystemRoles: [SYSTEM_ROLE_KEYS.systemAdmin],
    children: [
      {
        title: "ユーザー一覧",
        href: "/system/users",
        icon: UsersIcon,
        requiredSystemRoles: [SYSTEM_ROLE_KEYS.systemAdmin],
      },
    ],
  },
];

export const secondaryNavigation: AppNavigationItem[] = [
  {
    title: "ヘルプ",
    href: "/help",
    icon: CircleHelpIcon,
  },
];

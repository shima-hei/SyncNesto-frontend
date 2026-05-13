import {
  CircleHelpIcon,
  HomeIcon,
  Settings2Icon,
  type LucideIcon,
} from "lucide-react";

export type AppNavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const mainNavigation: AppNavigationItem[] = [
  {
    title: "ホーム",
    href: "/",
    icon: HomeIcon,
  },
];

export const secondaryNavigation: AppNavigationItem[] = [
  {
    title: "設定",
    href: "/settings",
    icon: Settings2Icon,
  },
  {
    title: "ヘルプ",
    href: "/help",
    icon: CircleHelpIcon,
  },
];

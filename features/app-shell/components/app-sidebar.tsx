"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CommandIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { hasAnySystemRole } from "@/features/auth/utils/authorization";

import { mainNavigation, secondaryNavigation } from "../constants/navigation";
import type { AppNavigationItem } from "../constants/navigation";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUserMenu } from "./sidebar-user-menu";

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user } = useAuth();
  const visibleMainNavigation = getVisibleNavigationItems(mainNavigation, user);
  const visibleSecondaryNavigation = getVisibleNavigationItems(
    secondaryNavigation,
    user
  );

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/">
                <CommandIcon />
                <span className="text-base font-semibold">Syncnesto</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarNav items={visibleMainNavigation} pathname={pathname} />
        <SidebarNav
          items={visibleSecondaryNavigation}
          pathname={pathname}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <SidebarUserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}

const getVisibleNavigationItems = (
  items: AppNavigationItem[],
  user: ReturnType<typeof useAuth>["user"]
) => {
  return items.filter((item) => {
    if (!item.requiredSystemRoles?.length) {
      return true;
    }

    return hasAnySystemRole(user, item.requiredSystemRoles);
  });
};

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CommandIcon, UsersIcon, FolderKanbanIcon } from "lucide-react";
import { useTenant } from "@/features/tenants/providers/tenant-provider";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useAuth } from "@/features/auth/providers/auth-provider";

import {
  mainNavigation,
  managementNavigation,
  secondaryNavigation,
} from "../../constants/navigation";
import { getVisibleNavigationItems } from "../../utils/navigation";
import { SidebarNav } from "../navigation/sidebar-nav";
import { SidebarUserMenu } from "../user/sidebar-user-menu";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { canManageTenant } = useTenant();
  const visibleMainNavigation = getVisibleNavigationItems(mainNavigation, user);
  const visibleManagementNavigation = getVisibleNavigationItems(
    managementNavigation,
    user,
  );
  const visibleSecondaryNavigation = getVisibleNavigationItems(
    secondaryNavigation,
    user,
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
        {canManageTenant ? (
          <>
            <SidebarSeparator />
            <SidebarNav
              pathname={pathname}
              label="組織"
              items={[
                {
                  title: "メンバー・組織設定",
                  href: "/organization",
                  icon: UsersIcon,
                },
                {
                  title: "プロジェクト管理",
                  href: "/projects/management",
                  icon: FolderKanbanIcon,
                },
              ]}
            />
          </>
        ) : null}
        {visibleManagementNavigation.length ? (
          <>
            <SidebarSeparator />
            <SidebarNav
              items={visibleManagementNavigation}
              pathname={pathname}
              label="管理"
            />
          </>
        ) : null}
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

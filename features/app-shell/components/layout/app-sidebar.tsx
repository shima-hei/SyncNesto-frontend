"use client";

import Link from "next/link";
import { JoinedProjectNav } from "@/features/projects/components/joined/joined-project-nav";
import { getJoinedProjectId } from "@/features/projects/constants/joined-project-navigation";
import { usePathname } from "next/navigation";
import { CommandIcon, UsersIcon, FolderKanbanIcon } from "lucide-react";

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

export function AppSidebar({
  scope,
  canManageTenant = false,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  scope: "system" | "organization";
  canManageTenant?: boolean;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const projectId = getJoinedProjectId(pathname);
  const system = scope === "system";
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
              <Link href={system ? "/system" : "/"}>
                <CommandIcon />
                <span className="text-base font-semibold">Syncnesto</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarNav
          items={system ? visibleManagementNavigation : visibleMainNavigation}
          pathname={pathname}
          label={system ? "システム管理" : "業務"}
        />
        {!system && projectId ? (
          <JoinedProjectNav key={projectId} projectId={projectId} />
        ) : null}
        {!system && canManageTenant ? (
          <>
            <SidebarSeparator />
            <SidebarNav
              pathname={pathname}
              label="現在の組織"
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
        <SidebarNav
          items={visibleSecondaryNavigation}
          pathname={pathname}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <SidebarUserMenu scope={scope} />
      </SidebarFooter>
    </Sidebar>
  );
}

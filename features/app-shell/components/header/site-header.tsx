"use client";

import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/shared/display/theme-switcher";
import { NotificationCenter } from "@/features/notifications/components/notification-center";
import { getJoinedProjectId } from "@/features/projects/constants/joined-project-navigation";
import { ProjectSwitcher } from "@/features/projects/components/joined/project-switcher";
import { TenantSwitcher } from "@/features/tenants/components/tenant-switcher";
import { useTenant } from "@/features/tenants/providers/tenant-provider";

import { MobileAppNavigation } from "../layout/app-sidebar";
import { HeaderUserMenu } from "../user/header-user-menu";
import { SiteBreadcrumbs } from "./site-breadcrumbs";

export function SiteHeader({
  scope,
  canManageTenant,
}: {
  scope: "system" | "organization";
  canManageTenant?: boolean;
}) {
  const pathname = usePathname();
  const projectId =
    scope === "organization" ? getJoinedProjectId(pathname) : null;

  return (
    <header className="flex h-12 min-w-0 shrink-0 items-center gap-1 border-b px-3 md:gap-2 md:px-6">
      <MobileAppNavigation scope={scope} canManageTenant={canManageTenant} />
      <div className="min-w-0 flex-1">
        {projectId ? (
          <ProjectSwitcher key={projectId} projectId={projectId} />
        ) : (
          <SiteBreadcrumbs />
        )}
      </div>
      {scope === "organization" && <OrganizationActions />}
      <ThemeSwitcher />
      <HeaderUserMenu scope={scope} />
    </header>
  );
}

function OrganizationActions() {
  const { tenant } = useTenant();
  return (
    <>
      <div className="hidden max-w-44 shrink-0 sm:block">
        <TenantSwitcher />
      </div>
      {tenant ? <NotificationCenter /> : null}
    </>
  );
}

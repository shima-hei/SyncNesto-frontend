"use client";

import { usePathname } from "next/navigation";
import { SiteBreadcrumbs } from "@/features/app-shell/components/header/site-breadcrumbs";
import { getJoinedProjectHref } from "../../constants/joined-project-navigation";

export function JoinedProjectBreadcrumbs({ projectId }: { projectId: number }) {
  const pathname = usePathname();
  const relative = pathname.slice(getJoinedProjectHref(projectId).length);
  if (relative.split("/").filter(Boolean).length < 2) return null;
  return <SiteBreadcrumbs />;
}

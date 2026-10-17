"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  joinedProjectNavigationGroups,
  joinedProjectNavigationItems,
  isJoinedProjectNavigationActive,
} from "../../constants/joined-project-navigation";
import { useCurrentProjectRole } from "../../hooks/use-current-project-role";
import { useProject } from "../../hooks/use-project";

export function JoinedProjectNav({ projectId }: { projectId: number }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { currentProjectRole, isLoading } = useCurrentProjectRole(projectId);
  const { project } = useProject(projectId);

  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-2 p-2"
        aria-label="案件内メニューを読み込み中"
      >
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    );
  }
  const visibleItems = joinedProjectNavigationItems.filter((item) =>
    item.canShow(currentProjectRole),
  );
  if (!visibleItems.length) return null;

  return (
    <nav aria-label="プロジェクト内ナビゲーション">
      <SidebarSeparator />
      <p className="px-4 pt-3 pb-1 text-sm font-semibold break-words">
        {project?.name ?? "このプロジェクト"}
      </p>
      {joinedProjectNavigationGroups.map((group) => {
        const items = visibleItems.filter((item) => item.group === group);
        if (!items.length) return null;
        return (
          <SidebarGroup key={group} className="py-1">
            <SidebarGroupLabel>{group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => {
                  const href = item.href(projectId);
                  const active = isJoinedProjectNavigationActive(
                    pathname,
                    href,
                    projectId,
                  );
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link
                          href={href}
                          aria-current={active ? "page" : undefined}
                          title={item.purpose}
                          onClick={(event) => {
                            if (
                              !event.defaultPrevented &&
                              event.button === 0 &&
                              !event.metaKey &&
                              !event.ctrlKey &&
                              !event.shiftKey &&
                              !event.altKey
                            ) {
                              setOpenMobile(false);
                            }
                          }}
                        >
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
    </nav>
  );
}

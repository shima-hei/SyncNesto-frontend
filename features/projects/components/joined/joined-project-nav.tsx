"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { joinedProjectNavigationItems } from "../../constants/joined-project-navigation";
import { useCurrentProjectRole } from "../../hooks/use-current-project-role";

type JoinedProjectNavProps = {
  projectId: number;
};

export function JoinedProjectNav({ projectId }: JoinedProjectNavProps) {
  const pathname = usePathname();
  const { currentProjectRole, isLoading } = useCurrentProjectRole(projectId);

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto border-b pb-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24 shrink-0" />
        ))}
      </div>
    );
  }

  const visibleItems = joinedProjectNavigationItems.filter((item) =>
    item.canShow(currentProjectRole)
  );

  if (!visibleItems.length) {
    return null;
  }

  return (
    <nav
      aria-label="プロジェクト内ナビゲーション"
      className="overflow-x-auto border-b pb-3"
    >
      <div className="flex min-w-max gap-1">
        {visibleItems.map((item) => {
          const href = item.href(projectId);
          const isActive = isNavigationActive(pathname, href, projectId);

          return (
            <Button
              key={href}
              asChild
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              className={cn("shrink-0", isActive && "font-medium")}
            >
              <Link href={href}>{item.label}</Link>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}

const isNavigationActive = (
  pathname: string,
  href: string,
  projectId: number
) => {
  const overviewHref = `/projects/joined/${projectId}`;

  if (href === overviewHref) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

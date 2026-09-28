"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
      <div className="flex gap-2 overflow-x-auto border-b">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="mb-1 h-9 w-24 shrink-0" />
        ))}
      </div>
    );
  }

  const visibleItems = joinedProjectNavigationItems.filter((item) =>
    item.canShow(currentProjectRole),
  );

  if (!visibleItems.length) {
    return null;
  }

  return (
    <nav
      aria-label="プロジェクト内ナビゲーション"
      className="overflow-x-auto border-b"
    >
      <div className="flex min-w-max gap-5">
        {visibleItems.map((item) => {
          const href = item.href(projectId);
          const isActive = isNavigationActive(pathname, href, projectId);

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center border-b-2 border-transparent px-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary",
                isActive && "border-primary font-medium text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const isNavigationActive = (
  pathname: string,
  href: string,
  projectId: number,
) => {
  const overviewHref = `/projects/joined/${projectId}`;

  if (href === overviewHref) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

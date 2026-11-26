"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  EllipsisIcon,
  SettingsIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";

import { AppNavigationLink } from "@/features/app-shell/components/navigation/app-navigation-link";
import {
  canManageProjectMembers,
  canUpdateDocument,
  canViewProjectFeature,
} from "@/features/auth/utils/authorization";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import {
  defaultProjectNavigation,
  getJoinedProjectHref,
  getProjectSection,
  getProjectSectionHref,
  isJoinedProjectNavigationActive,
  projectNavigationSections,
  projectSubviewLinks,
} from "../../constants/joined-project-navigation";
import { useCurrentProjectRole } from "../../hooks/use-current-project-role";
import { useProject } from "../../hooks/use-project";

const tabStyle =
  "inline-flex h-12 min-w-0 shrink-0 items-center justify-center gap-1.5 border-b-2 border-transparent px-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";
const selectedStyle = "border-primary text-foreground";
const overflowStyle =
  "flex min-h-9 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring";

export function JoinedProjectNav({ projectId }: { projectId: number }) {
  const pathname = usePathname();
  const { currentProjectRole, isLoading } = useCurrentProjectRole(projectId);

  if (isLoading)
    return <div className="h-12 shrink-0 border-b" aria-busy="true" />;
  if (!canViewProjectFeature(currentProjectRole)) return null;

  return (
    <ProjectNavigationBar
      projectId={projectId}
      pathname={pathname}
      canManage={canManageProjectMembers(currentProjectRole)}
      canOpenTrash={canUpdateDocument(currentProjectRole)}
    />
  );
}

function ProjectNavigationBar({
  projectId,
  pathname,
  canManage,
  canOpenTrash,
}: {
  projectId: number;
  pathname: string;
  canManage: boolean;
  canOpenTrash: boolean;
}) {
  const { project } = useProject(projectId);
  const navigation = project?.navigation ?? defaultProjectNavigation;
  const activeSection = getProjectSection(pathname, projectId);
  const row = useRef<HTMLUListElement>(null);
  const slot = useRef<HTMLSpanElement>(null);
  const [capacity, setCapacity] = useState(1);
  useLayoutEffect(() => {
    const container = row.current;
    const item = slot.current;
    if (!container || !item) return;
    const measure = () => {
      const width = item.getBoundingClientRect().width;
      if (width)
        setCapacity(Math.max(1, Math.floor(container.clientWidth / width) - 1));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(item);
    return () => observer.disconnect();
  }, []);

  const entries = navigation.items.flatMap(({ key, placement }) => {
    const section = projectNavigationSections.find(
      (candidate) => candidate.key === key,
    );
    if (!section || placement === "hidden") return [];
    return [
      {
        label: section.label,
        icon: section.icon,
        href: getProjectSectionHref(projectId, section, navigation),
        active: activeSection === key,
        placement,
      },
    ];
  });
  const primary = entries
    .filter(({ placement }) => placement === "primary")
    .slice(0, capacity);
  const overflow = entries.filter((entry) => !primary.includes(entry));

  const management = [
    {
      label: "メンバー",
      icon: UsersIcon,
      href: getJoinedProjectHref(projectId, "members"),
    },
    ...(canOpenTrash
      ? [
          {
            label: "ごみ箱",
            icon: Trash2Icon,
            href: getJoinedProjectHref(projectId, "trash"),
          },
        ]
      : []),
    ...(canManage
      ? [
          {
            label: "案件メニュー設定",
            icon: SettingsIcon,
            href: getJoinedProjectHref(projectId, "navigation"),
          },
        ]
      : []),
  ].map((entry) => ({
    ...entry,
    active: isJoinedProjectNavigationActive(pathname, entry.href, projectId),
  }));
  const more = [...overflow, ...management];
  const moreActive = more.some(({ active }) => active);
  const hiddenSection = navigation.items.find(
    ({ key, placement }) => key === activeSection && placement === "hidden",
  );

  return (
    <div className="min-w-0 border-b bg-background">
      <nav
        aria-label="プロジェクト内ナビゲーション"
        className="relative min-w-0 px-2 md:px-4"
      >
        <span
          ref={slot}
          className="pointer-events-none absolute h-0 w-[5.75rem]"
          aria-hidden
        />
        <ul ref={row} className="flex min-w-0 items-center">
          {primary.map(({ href, label, icon: Icon, active }) => (
            <li key={href} className="shrink-0">
              <AppNavigationLink
                href={href}
                aria-current={
                  active ? (pathname === href ? "page" : "location") : undefined
                }
                className={cn(tabStyle, "w-[5.75rem]", active && selectedStyle)}
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                <span>{label}</span>
              </AppNavigationLink>
            </li>
          ))}
          <li className="ml-auto shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={cn(
                    tabStyle,
                    "w-[5.75rem] rounded-none",
                    moreActive && selectedStyle,
                  )}
                >
                  <EllipsisIcon data-icon="inline-start" aria-hidden />
                  その他
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                aria-label="その他の案件メニュー"
                className="w-48 gap-1 p-1"
              >
                <ul>
                  {more.map(({ href, label, icon: Icon, active }) => (
                    <li key={href}>
                      <AppNavigationLink
                        href={href}
                        aria-current={
                          active
                            ? pathname === href
                              ? "page"
                              : "location"
                            : undefined
                        }
                        className={cn(
                          overflowStyle,
                          active &&
                            "bg-accent font-semibold text-accent-foreground",
                        )}
                      >
                        <Icon aria-hidden className="size-4 shrink-0" />
                        {label}
                      </AppNavigationLink>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          </li>
        </ul>
        {hiddenSection && (
          <span className="sr-only">
            現在の画面は案件メニューで非表示に設定されています。
          </span>
        )}
      </nav>
      {(activeSection === "requirements" || activeSection === "tests") && (
        <nav
          aria-label={
            activeSection === "requirements" ? "要件の画面" : "テストの画面"
          }
          className="flex min-w-0 items-center gap-1 border-t px-3 py-1 md:px-5"
        >
          {projectSubviewLinks[activeSection].map(({ path, label }) => {
            const href = getJoinedProjectHref(projectId, path);
            const active =
              isJoinedProjectNavigationActive(pathname, href, projectId) ||
              (path === "fixed-approvals" &&
                isJoinedProjectNavigationActive(
                  pathname,
                  getJoinedProjectHref(projectId, "requirement-workflow"),
                  projectId,
                )) ||
              (path === "requirements" &&
                ["requirement-verifications", "requirement-verdicts"].some(
                  (prefix) =>
                    isJoinedProjectNavigationActive(
                      pathname,
                      getJoinedProjectHref(projectId, prefix),
                      projectId,
                    ),
                ));
            return (
              <Button
                asChild
                key={href}
                size="sm"
                variant={active ? "secondary" : "ghost"}
              >
                <AppNavigationLink
                  href={href}
                  aria-current={
                    active
                      ? pathname === href
                        ? "page"
                        : "location"
                      : undefined
                  }
                >
                  {label}
                </AppNavigationLink>
              </Button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

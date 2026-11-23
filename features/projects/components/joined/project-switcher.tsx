"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { CheckIcon, ChevronDownIcon, FolderKanbanIcon } from "lucide-react";

import { AppNavigationLink } from "@/features/app-shell/components/navigation/app-navigation-link";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { canViewProjectFeature } from "@/features/auth/utils/authorization";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  readCurrentProjectRoleProjectsProjectIdMeGet,
  readProjectProjectsProjectIdGet,
  useListProjectsProjectsGet,
} from "@/lib/api/generated/projects/projects";

import { useCurrentProjectRole } from "../../hooks/use-current-project-role";
import { useProject } from "../../hooks/use-project";

const RECENT_PROJECT_LIMIT = 4;

function recentProjectIds(key: string): number[] {
  try {
    const ids: unknown = JSON.parse(sessionStorage.getItem(key) ?? "[]");
    return Array.isArray(ids)
      ? ids
          .filter(
            (id): id is number =>
              typeof id === "number" && Number.isSafeInteger(id) && id > 0,
          )
          .slice(0, RECENT_PROJECT_LIMIT)
      : [];
  } catch {
    return [];
  }
}

export function ProjectSwitcher({ projectId }: { projectId: number }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const keyword = useDeferredValue(search.trim());
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const { project } = useProject(projectId);
  const allowed = canViewProjectFeature(currentProjectRole);
  const storageKey = `syncnesto:recent-projects:${user?.demo?.id ?? "normal"}:${user?.id}:${tenant?.id}`;

  useEffect(() => {
    if (!allowed || !project) return;
    const ids = [
      project.id,
      ...recentProjectIds(storageKey).filter((id) => id !== project.id),
    ];
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify(ids.slice(0, RECENT_PROJECT_LIMIT)),
      );
    } catch {
      // 保存できない場合も案件検索と移動は利用できる。
    }
  }, [allowed, project, storageKey]);

  const projects = useListProjectsProjectsGet(
    { member_only: true, page_size: 20, q: keyword || undefined },
    { query: { enabled: open, retry: false } },
  );
  const recentQueries = useQueries({
    queries:
      open && !keyword
        ? recentProjectIds(storageKey).map((id) => ({
            queryKey: ["project-switcher-recent", id],
            retry: false,
            queryFn: async ({ signal }: { signal: AbortSignal }) => {
              const role = await readCurrentProjectRoleProjectsProjectIdMeGet(
                id,
                { signal },
              );
              return canViewProjectFeature(role)
                ? readProjectProjectsProjectIdGet(id, { signal })
                : null;
            },
          }))
        : [],
  });
  const recent = recentQueries.flatMap(({ data }) => (data ? [data] : []));
  const other = (projects.data?.items ?? []).filter(
    ({ id }) => !recent.some((item) => item.id === id),
  );

  const projectLinks = (
    items: { id: number; name: string; project_code: string }[],
  ) =>
    items.map((item) => (
      <li key={item.id}>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="flex h-auto min-h-8 w-full justify-start gap-2 px-2 py-1"
        >
          <AppNavigationLink
            href={`/projects/joined/${item.id}`}
            aria-current={item.id === projectId ? "location" : undefined}
            onClick={(event) => {
              if (
                item.id !== projectId ||
                event.metaKey ||
                event.ctrlKey ||
                event.altKey ||
                event.shiftKey
              )
                return;
              event.preventDefault();
              setOpen(false);
            }}
          >
            <span className="min-w-0 flex-1 truncate text-left">
              {item.name}
            </span>
            <span className="hidden max-w-24 truncate text-xs text-muted-foreground sm:inline">
              {item.project_code}
            </span>
            {item.id === projectId && (
              <CheckIcon data-icon="inline-end" aria-hidden />
            )}
          </AppNavigationLink>
        </Button>
      </li>
    ));

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-w-0 max-w-full gap-1.5 px-2 text-sm font-semibold"
          aria-label={
            allowed && project
              ? `案件を切り替え: ${project.name}`
              : "案件を切り替え"
          }
        >
          <FolderKanbanIcon data-icon="inline-start" aria-hidden />
          <span className="min-w-0 truncate">
            {allowed && project ? project.name : "案件を切り替え"}
          </span>
          <ChevronDownIcon
            data-icon="inline-end"
            className="text-muted-foreground"
            aria-hidden
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        aria-label="案件切替"
        className="w-[min(22rem,calc(100vw-1rem))] gap-2 p-2"
      >
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="案件名・コードで検索"
          placeholder="案件名・コードで検索"
        />
        <div className="max-h-72 overflow-y-auto overscroll-contain">
          {recent.length > 0 && (
            <div className="pb-1">
              <p className="px-2 py-1 text-xs text-muted-foreground">
                最近の案件
              </p>
              <ul>{projectLinks(recent)}</ul>
            </div>
          )}
          {projects.isLoading && (
            <p role="status" className="p-2 text-sm text-muted-foreground">
              読み込み中…
            </p>
          )}
          {projects.isError && (
            <p role="alert" className="p-2 text-sm text-destructive">
              案件を取得できませんでした。
            </p>
          )}
          {keyword && projects.isSuccess && other.length === 0 && (
            <p role="status" className="p-2 text-sm text-muted-foreground">
              該当する案件がありません。
            </p>
          )}
          {other.length > 0 && <ul>{projectLinks(other)}</ul>}
        </div>
        <Button asChild size="sm" variant="ghost" className="justify-start">
          <AppNavigationLink href="/projects/joined">
            案件一覧を開く
          </AppNavigationLink>
        </Button>
      </PopoverContent>
    </Popover>
  );
}

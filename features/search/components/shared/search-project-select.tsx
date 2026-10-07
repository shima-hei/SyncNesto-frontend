"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { searchProjectsSearchProjectsGet as searchProjects } from "@/lib/api/generated/search/search";
import { useTenant } from "@/features/tenants/providers/tenant-provider";

export function SearchProjectSelect({
  value,
  onChange,
}: {
  value?: number;
  onChange: (id: number | undefined) => void;
}) {
  const { tenant } = useTenant();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim().slice(0, 200)), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useQuery({
    queryKey: ["search-projects", tenant?.id, q, page, value],
    queryFn: ({ signal }) =>
      searchProjects({ q, page, selected_id: value }, { signal }),
    enabled: open || value !== undefined,
    retry: false,
  });
  const select = (id: number | undefined) => {
    setOpen(false);
    onChange(id);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="search-project"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="プロジェクトで絞り込む"
          className="w-full justify-between"
        >
          <span className="truncate">
            {value === undefined
              ? "すべての参加プロジェクト"
              : (query.data?.selected?.name ?? "選択したプロジェクト")}
          </span>
          <ChevronsUpDownIcon data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <Command shouldFilter={false}>
          <CommandInput
            aria-label="プロジェクト候補を検索"
            maxLength={200}
            placeholder="プロジェクト名・コードで検索"
            value={search}
            onValueChange={(text) => {
              setSearch(text);
              setPage(1);
            }}
          />
          <CommandList>
            <CommandGroup>
              <CommandItem value="all" onSelect={() => select(undefined)}>
                すべての参加プロジェクト
              </CommandItem>
            </CommandGroup>
            {query.isFetching ? (
              <p className="p-3 text-sm" role="status">
                候補を検索中…
              </p>
            ) : query.isError ? (
              <div className="flex flex-col gap-2 p-3" role="alert">
                <p className="text-sm">プロジェクトを取得できませんでした。</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void query.refetch()}
                >
                  再試行
                </Button>
              </div>
            ) : (
              <CommandGroup heading="参加プロジェクト">
                {query.data?.items.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={String(project.id)}
                    onSelect={() => select(project.id)}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{project.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {project.project_code}
                      </span>
                    </span>
                  </CommandItem>
                ))}
                {query.data?.total === 0 ? (
                  <p
                    className="p-3 text-sm text-muted-foreground"
                    role="status"
                  >
                    条件に一致する参加プロジェクトがありません。
                  </p>
                ) : null}
              </CommandGroup>
            )}
          </CommandList>
          {(query.data?.total ?? 0) > 50 ? (
            <div className="flex items-center justify-between gap-2 border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page === 1 || query.isFetching}
                onClick={() => setPage(page - 1)}
              >
                前の候補
              </Button>
              <span className="text-xs text-muted-foreground">
                {page} / {Math.ceil((query.data?.total ?? 0) / 50)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={
                  page * 50 >= (query.data?.total ?? 0) ||
                  page >= 500 ||
                  query.isFetching
                }
                onClick={() => setPage(page + 1)}
              >
                次の候補
              </Button>
            </div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

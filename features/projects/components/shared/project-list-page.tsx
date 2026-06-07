"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { SearchFilterBar } from "@/components/shared/filters/search-filter-bar";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PROJECT_STATUS_OPTIONS } from "../../constants/project-form";
import { useProjects } from "../../hooks/use-projects";
import { ProjectsTable } from "../tables/projects-table";

const PAGE_SIZE = 20;
const ALL_STATUSES = "all";

type ProjectListPageProps = {
  title: string;
  description: string;
  detailBasePath: string;
  createHref?: string;
};

export function ProjectListPage({
  title,
  description,
  detailBasePath,
  createHref,
}: ProjectListPageProps) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(ALL_STATUSES);
  const projectListParams = useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      q: q || undefined,
      status: status === ALL_STATUSES ? undefined : status,
    }),
    [page, q, status]
  );
  const { projects, total, isLoading, isFetching } =
    useProjects(projectListParams);

  const handleSearch = () => {
    setPage(1);
    setQ(searchInput.trim());
  };

  const handleStatusChange = (value: string) => {
    setPage(1);
    setStatus(value);
  };

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {createHref ? (
        <div>
          <Button asChild>
            <Link href={createHref}>プロジェクト登録</Link>
          </Button>
        </div>
      ) : null}
      <SearchFilterBar
        searchValue={searchInput}
        searchPlaceholder="コード、名称、説明で検索"
        onSearchValueChange={setSearchInput}
        onSearch={handleSearch}
      >
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_STATUSES}>すべて</SelectItem>
              {PROJECT_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </SearchFilterBar>
      <ProjectsTable
        projects={projects}
        isLoading={isLoading}
        detailBasePath={detailBasePath}
      />
      <DataPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        currentCount={projects.length}
        isFetching={isFetching}
        isLoading={isLoading}
        onPageChange={setPage}
      />
    </div>
  );
}

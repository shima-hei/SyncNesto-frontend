"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const { projects, total, isLoading, isFetching } = useProjects({
    page,
    page_size: PAGE_SIZE,
    q: q || undefined,
    status: status === ALL_STATUSES ? undefined : status,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) => {
    event.preventDefault();
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <form
          className="flex w-full flex-col gap-2 sm:flex-row md:max-w-xl"
          onSubmit={handleSearch}
        >
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="コード、名称、説明で検索"
          />
          <Button type="submit" variant="outline">
            <SearchIcon data-icon="inline-start" />
            検索
          </Button>
        </form>
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
      </div>
      <ProjectsTable
        projects={projects}
        isLoading={isLoading}
        detailBasePath={detailBasePath}
      />
      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          {total}件中 {projects.length}件を表示
          {isFetching && !isLoading ? "・更新中" : ""}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            前へ
          </Button>
          <span>
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          >
            次へ
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  );
}

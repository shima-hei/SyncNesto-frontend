"use client";

import { useState } from "react";
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
import { canCreateRequirement } from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";

import { REQUIREMENT_DOCUMENT_STATUS_OPTIONS } from "../../constants/requirement-options";
import { useRequirementDocuments } from "../../hooks/use-requirement-documents";
import { RequirementDocumentsTable } from "../tables/requirement-documents-table";

const PAGE_SIZE = 20;
const ALL_STATUSES = "all";

type RequirementDocumentsPageProps = {
  projectId: number;
};

export function RequirementDocumentsPage({
  projectId,
}: RequirementDocumentsPageProps) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(ALL_STATUSES);
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const { documents, total, isLoading, isFetching } = useRequirementDocuments(
    projectId,
    {
      page,
      page_size: PAGE_SIZE,
      q: q || undefined,
      status: status === ALL_STATUSES ? undefined : status,
    }
  );

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
        <h2 className="text-lg font-semibold">要件定義</h2>
        <p className="text-sm text-muted-foreground">
          プロジェクトの要件定義書と要件を管理します。
        </p>
      </div>
      {canCreateRequirement(currentProjectRole) ? (
        <div>
          <Button asChild>
            <Link href={`/projects/joined/${projectId}/requirements/new`}>
              要件定義書登録
            </Link>
          </Button>
        </div>
      ) : null}
      <SearchFilterBar
        searchValue={searchInput}
        searchPlaceholder="タイトル、コード、目的で検索"
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
              {REQUIREMENT_DOCUMENT_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </SearchFilterBar>
      <RequirementDocumentsTable
        projectId={projectId}
        documents={documents}
        isLoading={isLoading}
      />
      <DataPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        currentCount={documents.length}
        isFetching={isFetching}
        isLoading={isLoading}
        onPageChange={setPage}
      />
    </div>
  );
}

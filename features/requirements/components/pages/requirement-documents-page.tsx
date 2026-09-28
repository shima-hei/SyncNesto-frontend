"use client";

import { useState } from "react";
import Link from "next/link";

import { SearchFilterBar } from "@/components/shared/filters/search-filter-bar";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { PageHeader } from "@/components/shared/layout/page-header";
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
  const { documents, total, isLoading, isFetching, error, refetch } =
    useRequirementDocuments(projectId, {
      page,
      page_size: PAGE_SIZE,
      q: q || undefined,
      status: status === ALL_STATUSES ? undefined : status,
    });

  const handleSearch = () => {
    setPage(1);
    setQ(searchInput.trim());
  };

  const handleStatusChange = (value: string) => {
    setPage(1);
    setStatus(value);
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="要件定義"
        description="プロジェクトの要件定義書と要件を管理します。"
        actions={
          canCreateRequirement(currentProjectRole) ? (
            <Button asChild>
              <Link href={`/projects/joined/${projectId}/requirements/new`}>
                要件定義書登録
              </Link>
            </Button>
          ) : null
        }
      />
      <SearchFilterBar
        searchValue={searchInput}
        searchLabel="要件定義書を検索"
        searchPlaceholder="タイトル、コード、目的で検索"
        onSearchValueChange={setSearchInput}
        onSearch={handleSearch}
      >
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger
            className="w-full sm:w-40"
            aria-label="ステータスで絞り込み"
          >
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
      {error && !isLoading ? (
        <DataLoadError
          resourceName="要件定義書"
          isRetrying={isFetching}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

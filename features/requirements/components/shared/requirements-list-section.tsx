"use client";

import { useState } from "react";

import { SearchFilterBar } from "@/components/shared/filters/search-filter-bar";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  REQUIREMENT_STATUS_OPTIONS,
  REQUIREMENT_TYPE_OPTIONS,
} from "../../constants/requirement-options";
import { useRequirements } from "../../hooks/use-requirements";
import { RequirementsTable } from "../tables/requirements-table";

const PAGE_SIZE = 20;
const ALL_STATUSES = "all";
const ALL_TYPES = "all";

type RequirementsListSectionProps = {
  projectId: number;
  documentId: number;
};

export function RequirementsListSection({
  projectId,
  documentId,
}: RequirementsListSectionProps) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(ALL_STATUSES);
  const [requirementType, setRequirementType] = useState(ALL_TYPES);
  const { requirements, total, isLoading, isFetching } = useRequirements(
    projectId,
    {
      page,
      page_size: PAGE_SIZE,
      document_id: documentId,
      q: q || undefined,
      status: status === ALL_STATUSES ? undefined : status,
      requirement_type:
        requirementType === ALL_TYPES ? undefined : requirementType,
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

  const handleTypeChange = (value: string) => {
    setPage(1);
    setRequirementType(value);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">要件一覧</h3>
        <p className="text-sm text-muted-foreground">
          要件定義書に紐づく要件を管理します。
        </p>
      </div>
      <SearchFilterBar
        searchValue={searchInput}
        searchPlaceholder="要件コード、タイトル、説明で検索"
        onSearchValueChange={setSearchInput}
        onSearch={handleSearch}
      >
        <Select value={requirementType} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="種別" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_TYPES}>すべて</SelectItem>
              {REQUIREMENT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_STATUSES}>すべて</SelectItem>
              {REQUIREMENT_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </SearchFilterBar>
      <RequirementsTable
        projectId={projectId}
        documentId={documentId}
        requirements={requirements}
        isLoading={isLoading}
      />
      <DataPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        currentCount={requirements.length}
        isFetching={isFetching}
        isLoading={isLoading}
        onPageChange={setPage}
      />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

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
  REQUIREMENT_PRIORITY_OPTIONS,
  REQUIREMENT_STATUS_OPTIONS,
  REQUIREMENT_TYPE_OPTIONS,
} from "../../constants/requirement-options";
import { useRequirements } from "../../hooks/use-requirements";
import { RequirementOwnerFilter } from "../filters/requirement-owner-filter";
import { RequirementsTable } from "../tables/requirements-table";

const PAGE_SIZE = 20;
const ALL_STATUSES = "all";
const ALL_TYPES = "all";
const ALL_PRIORITIES = "all";

const SORT_OPTIONS = [
  { value: "updated_desc", label: "更新日時 新しい順" },
  { value: "updated_asc", label: "更新日時 古い順" },
  { value: "code_asc", label: "要件コード 昇順" },
  { value: "code_desc", label: "要件コード 降順" },
  { value: "title_asc", label: "タイトル 昇順" },
  { value: "title_desc", label: "タイトル 降順" },
] as const;

type RequirementsListSectionProps = {
  projectId: number;
  documentId: number;
  sectionId?: number | null;
  canUpdate: boolean;
  selectedRequirementId?: number | null;
  onSelectRequirement?: (requirementId: number) => void;
};

export function RequirementsListSection({
  projectId,
  documentId,
  sectionId,
  canUpdate,
  selectedRequirementId,
  onSelectRequirement,
}: RequirementsListSectionProps) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(ALL_STATUSES);
  const [requirementType, setRequirementType] = useState(ALL_TYPES);
  const [priority, setPriority] = useState(ALL_PRIORITIES);
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]["value"]>(
    "updated_desc"
  );
  const { requirements, total, isLoading, isFetching } = useRequirements(
    projectId,
    {
      page,
      page_size: PAGE_SIZE,
      document_id: documentId,
      section_id: sectionId ?? undefined,
      q: q || undefined,
      status: status === ALL_STATUSES ? undefined : status,
      requirement_type:
        requirementType === ALL_TYPES ? undefined : requirementType,
      priority: priority === ALL_PRIORITIES ? undefined : priority,
      owner_id: ownerId ?? undefined,
    }
  );
  const sortedRequirements = useMemo(() => {
    return requirements.slice().sort((left, right) => {
      switch (sort) {
        case "updated_asc":
          return left.updated_at.localeCompare(right.updated_at);
        case "code_asc":
          return left.requirement_code.localeCompare(right.requirement_code);
        case "code_desc":
          return right.requirement_code.localeCompare(left.requirement_code);
        case "title_asc":
          return left.title.localeCompare(right.title);
        case "title_desc":
          return right.title.localeCompare(left.title);
        case "updated_desc":
        default:
          return right.updated_at.localeCompare(left.updated_at);
      }
    });
  }, [requirements, sort]);

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

  const handlePriorityChange = (value: string) => {
    setPage(1);
    setPriority(value);
  };

  const handleOwnerChange = (value: number | null) => {
    setPage(1);
    setOwnerId(value);
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
        variant="compact"
        onSearchValueChange={setSearchInput}
        onSearch={handleSearch}
      >
        <Select value={requirementType} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full">
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
          <SelectTrigger className="w-full">
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
        <Select value={priority} onValueChange={handlePriorityChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="優先度" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_PRIORITIES}>すべて</SelectItem>
              {REQUIREMENT_PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <RequirementOwnerFilter
          projectId={projectId}
          value={ownerId}
          onChange={handleOwnerChange}
        />
        <Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="並び替え" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {SORT_OPTIONS.map((option) => (
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
        requirements={sortedRequirements}
        isLoading={isLoading}
        canUpdate={canUpdate}
        selectedRequirementId={selectedRequirementId}
        onSelectRequirement={onSelectRequirement}
      />
      <DataPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        currentCount={sortedRequirements.length}
        isFetching={isFetching}
        isLoading={isLoading}
        onPageChange={setPage}
      />
    </div>
  );
}

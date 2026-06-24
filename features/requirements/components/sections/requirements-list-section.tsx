"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { SearchFilterBar } from "@/components/shared/filters/search-filter-bar";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
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
import { useRequirementSections } from "../../hooks/use-requirement-sections";
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
  canCreate: boolean;
  canUpdate: boolean;
  selectedRequirementId?: number | null;
  onSelectRequirement?: (requirementId: number) => void;
};

export function RequirementsListSection({
  projectId,
  documentId,
  sectionId,
  canCreate,
  canUpdate,
  selectedRequirementId,
  onSelectRequirement,
}: RequirementsListSectionProps) {
  const { sections } = useRequirementSections(projectId, documentId);
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
  const selectedSection = sections.find((section) => section.id === sectionId);
  const createHref = sectionId
    ? `/projects/joined/${projectId}/requirements/${documentId}/items/new?sectionId=${sectionId}`
    : `/projects/joined/${projectId}/requirements/${documentId}/items/new`;

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
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">要件一覧</h3>
          <p className="text-sm text-muted-foreground">
            配置先: {selectedSection?.title ?? "セクション未設定"}
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href={createHref}>
              <PlusIcon data-icon="inline-start" />
              この配置先に要件を追加
            </Link>
          </Button>
        ) : null}
      </div>
      <SearchFilterBar
        searchValue={searchInput}
        searchLabel="キーワード"
        searchPlaceholder="要件コード、タイトル、説明で検索"
        variant="compact"
        onSearchValueChange={setSearchInput}
        onSearch={handleSearch}
      >
        <RequirementFilterSelect
          label="種別"
          value={requirementType}
          placeholder="種別を選択"
          allValue={ALL_TYPES}
          allLabel="すべての種別"
          options={REQUIREMENT_TYPE_OPTIONS}
          onValueChange={handleTypeChange}
        />
        <RequirementFilterSelect
          label="ステータス"
          value={status}
          placeholder="ステータスを選択"
          allValue={ALL_STATUSES}
          allLabel="すべてのステータス"
          options={REQUIREMENT_STATUS_OPTIONS}
          onValueChange={handleStatusChange}
        />
        <RequirementFilterSelect
          label="優先度"
          value={priority}
          placeholder="優先度を選択"
          allValue={ALL_PRIORITIES}
          allLabel="すべての優先度"
          options={REQUIREMENT_PRIORITY_OPTIONS}
          onValueChange={handlePriorityChange}
        />
        <RequirementOwnerFilter
          projectId={projectId}
          value={ownerId}
          label="担当者"
          onChange={handleOwnerChange}
        />
        <RequirementFilterSelect
          label="並び順"
          value={sort}
          placeholder="並び順を選択"
          options={SORT_OPTIONS}
          onValueChange={(value) => setSort(value as typeof sort)}
        />
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

type RequirementFilterSelectProps = {
  label: string;
  value: string;
  placeholder: string;
  options: readonly { value: string; label: string }[];
  allValue?: string;
  allLabel?: string;
  onValueChange: (value: string) => void;
};

function RequirementFilterSelect({
  label,
  value,
  placeholder,
  options,
  allValue,
  allLabel,
  onValueChange,
}: RequirementFilterSelectProps) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {allValue && allLabel ? (
              <SelectItem value={allValue}>{allLabel}</SelectItem>
            ) : null}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

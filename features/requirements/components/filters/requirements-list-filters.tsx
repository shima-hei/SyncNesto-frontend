"use client";

import { SearchFilterBar } from "@/components/shared/filters/search-filter-bar";
import { ChevronDownIcon, ListFilterIcon } from "lucide-react";
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
import {
  ALL_REQUIREMENT_PRIORITIES,
  ALL_REQUIREMENT_STATUSES,
  ALL_REQUIREMENT_TYPES,
  REQUIREMENT_SORT_OPTIONS,
} from "../../constants/requirement-view-options";
import { RequirementOwnerFilter } from "./requirement-owner-filter";

type RequirementsListFiltersProps = {
  projectId: number;
  searchInput: string;
  status: string;
  requirementType: string;
  priority: string;
  ownerId: number | null;
  sort: string;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onOwnerChange: (value: number | null) => void;
  onSortChange: (value: string) => void;
};

export function RequirementsListFilters({
  projectId,
  searchInput,
  status,
  requirementType,
  priority,
  ownerId,
  sort,
  onSearchInputChange,
  onSearch,
  onStatusChange,
  onTypeChange,
  onPriorityChange,
  onOwnerChange,
  onSortChange,
}: RequirementsListFiltersProps) {
  const active = [
    status !== ALL_REQUIREMENT_STATUSES,
    requirementType !== ALL_REQUIREMENT_TYPES,
    priority !== ALL_REQUIREMENT_PRIORITIES,
    ownerId !== null,
  ].filter(Boolean).length;
  return (
    <SearchFilterBar
      searchValue={searchInput}
      searchLabel="要件を検索"
      searchPlaceholder="要件コード、タイトル、説明"
      variant="compact"
      onSearchValueChange={onSearchInputChange}
      onSearch={onSearch}
    >
      <details className="group col-span-full">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-2 rounded-md border px-3 py-2 text-sm marker:content-none hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          <ListFilterIcon className="size-4" aria-hidden />
          フィルタ
          {active ? (
            <span className="tabular-nums text-muted-foreground">
              {active}件
            </span>
          ) : null}
          <ChevronDownIcon
            className="size-4 text-muted-foreground group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="grid min-w-0 gap-2 pt-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr))]">
          <RequirementFilterSelect
            label="種別"
            value={requirementType}
            placeholder="種別を選択"
            allValue={ALL_REQUIREMENT_TYPES}
            allLabel="すべての種別"
            options={REQUIREMENT_TYPE_OPTIONS}
            onValueChange={onTypeChange}
          />
          <RequirementFilterSelect
            label="ステータス"
            value={status}
            placeholder="ステータスを選択"
            allValue={ALL_REQUIREMENT_STATUSES}
            allLabel="すべてのステータス"
            options={REQUIREMENT_STATUS_OPTIONS}
            onValueChange={onStatusChange}
          />
          <RequirementFilterSelect
            label="優先度"
            value={priority}
            placeholder="優先度を選択"
            allValue={ALL_REQUIREMENT_PRIORITIES}
            allLabel="すべての優先度"
            options={REQUIREMENT_PRIORITY_OPTIONS}
            onValueChange={onPriorityChange}
          />
          <RequirementOwnerFilter
            projectId={projectId}
            value={ownerId}
            label="担当者"
            onChange={onOwnerChange}
          />
          <RequirementFilterSelect
            label="並び順"
            value={sort}
            placeholder="並び順を選択"
            options={REQUIREMENT_SORT_OPTIONS}
            onValueChange={onSortChange}
          />
        </div>
      </details>
    </SearchFilterBar>
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

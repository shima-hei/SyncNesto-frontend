"use client";

import { SearchFilterBar } from "@/components/shared/filters/search-filter-bar";
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
  return (
    <SearchFilterBar
      searchValue={searchInput}
      searchLabel="キーワード"
      searchPlaceholder="要件コード、タイトル、説明で検索"
      variant="compact"
      onSearchValueChange={onSearchInputChange}
      onSearch={onSearch}
    >
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

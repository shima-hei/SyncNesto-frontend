"use client";

import { useId, useState } from "react";
import { SlidersHorizontalIcon } from "lucide-react";

import { SearchFilterBar } from "@/components/shared/filters/search-filter-bar";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_TYPE_OPTIONS,
} from "../../../constants/task-options";
import {
  ALL_OVERDUE,
  ALL_PRIORITIES,
  ALL_STATUSES,
  ALL_TYPES,
  SORT_OPTIONS,
} from "../../../constants/task-view-options";
import { TaskRequirementSelectField } from "../../forms/task-requirement-select-field";
import { TaskUserSelectField } from "../../forms/task-user-select-field";
import { TaskFilterSelect } from "./task-filter-select";

export function TaskFilters({
  projectId,
  searchInput,
  status,
  priority,
  taskType,
  overdue,
  assigneeId,
  requirementId,
  tag,
  startDateFrom,
  dueDateTo,
  sort,
  onSearchInputChange,
  onSearch,
  onStatusChange,
  onPriorityChange,
  onTaskTypeChange,
  onAssigneeIdChange,
  onRequirementIdChange,
  onTagChange,
  onStartDateFromChange,
  onDueDateToChange,
  onOverdueChange,
  onSortChange,
}: {
  projectId: number;
  searchInput: string;
  status: string;
  priority: string;
  taskType: string;
  overdue: string;
  assigneeId: string;
  requirementId: string;
  tag: string;
  startDateFrom: string;
  dueDateTo: string;
  sort: string;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onTaskTypeChange: (value: string) => void;
  onAssigneeIdChange: (value: string) => void;
  onRequirementIdChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onStartDateFromChange: (value: string) => void;
  onDueDateToChange: (value: string) => void;
  onOverdueChange: (value: string) => void;
  onSortChange: (value: string) => void;
}) {
  const advancedId = useId();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const advancedCount = [
    priority !== ALL_PRIORITIES,
    taskType !== ALL_TYPES,
    overdue !== ALL_OVERDUE,
    Boolean(requirementId),
    Boolean(tag),
    Boolean(startDateFrom),
    Boolean(dueDateTo),
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-2">
      <SearchFilterBar
        searchValue={searchInput}
        searchLabel="キーワード"
        searchPlaceholder="タスクID、タイトル、説明で検索"
        variant="compact"
        onSearchValueChange={onSearchInputChange}
        onSearch={onSearch}
      >
        <TaskFilterSelect
          label="ステータス"
          value={status}
          placeholder="ステータスを選択"
          allValue={ALL_STATUSES}
          allLabel="すべてのステータス"
          options={TASK_STATUS_OPTIONS}
          onValueChange={onStatusChange}
        />
        <TaskUserSelectField
          projectId={projectId}
          label="担当者"
          value={assigneeId}
          placeholder="担当者を選択"
          onChange={onAssigneeIdChange}
        />
        <TaskFilterSelect
          label="並び順"
          value={sort}
          placeholder="並び順を選択"
          options={SORT_OPTIONS}
          onValueChange={onSortChange}
        />
      </SearchFilterBar>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        aria-expanded={isAdvancedOpen}
        aria-controls={advancedId}
        onClick={() => setIsAdvancedOpen((current) => !current)}
      >
        <SlidersHorizontalIcon data-icon="inline-start" aria-hidden="true" />
        詳細条件{advancedCount ? `（${advancedCount}件適用中）` : ""}
      </Button>
      <div
        id={advancedId}
        className={
          isAdvancedOpen
            ? "grid gap-3 border-t pt-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "hidden"
        }
      >
        <TaskFilterSelect
          label="優先度"
          value={priority}
          placeholder="優先度を選択"
          allValue={ALL_PRIORITIES}
          allLabel="すべての優先度"
          options={TASK_PRIORITY_OPTIONS}
          onValueChange={onPriorityChange}
        />
        <TaskFilterSelect
          label="種別"
          value={taskType}
          placeholder="種別を選択"
          allValue={ALL_TYPES}
          allLabel="すべての種別"
          options={TASK_TYPE_OPTIONS}
          onValueChange={onTaskTypeChange}
        />
        <TaskFilterSelect
          label="期限"
          value={overdue}
          placeholder="期限を選択"
          allValue={ALL_OVERDUE}
          allLabel="すべての期限"
          options={[{ value: "overdue", label: "期限超過" }]}
          onValueChange={onOverdueChange}
        />
        <TaskRequirementSelectField
          projectId={projectId}
          value={requirementId}
          placeholder="関連要件を選択"
          onChange={onRequirementIdChange}
        />
        <Field>
          <FieldLabel htmlFor="task-list-tag-filter">タグ</FieldLabel>
          <Input
            id="task-list-tag-filter"
            value={tag}
            placeholder="タグで絞り込み"
            onChange={(event) => onTagChange(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="task-list-start-date-filter">開始日</FieldLabel>
          <Input
            id="task-list-start-date-filter"
            type="date"
            value={startDateFrom}
            onChange={(event) => onStartDateFromChange(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="task-list-due-date-filter">
            終了予定日
          </FieldLabel>
          <Input
            id="task-list-due-date-filter"
            type="date"
            value={dueDateTo}
            onChange={(event) => onDueDateToChange(event.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

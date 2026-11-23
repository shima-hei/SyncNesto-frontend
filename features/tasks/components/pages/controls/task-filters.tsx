"use client";

import { useId, useState, type ReactNode } from "react";
import {
  CircleHelpIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from "lucide-react";

import { SearchFilterBar } from "@/components/shared/filters/search-filter-bar";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

import { TASK_PRIORITY_OPTIONS } from "../../../constants/task-options";
import {
  ALL_OVERDUE,
  ALL_PRIORITIES,
  ALL_TYPES,
  SORT_OPTIONS,
} from "../../../constants/task-view-options";
import { TaskFilterSelect } from "./task-filter-select";
import { TaskStatusFilterControl } from "./task-status-filter";
import type { TaskStatusFilter } from "../../../lib/task-list-filters";
import { useTaskTypes } from "../../../hooks/use-task-types";

export function TaskFilters({
  searchInput,
  status,
  priority,
  taskType,
  overdue,
  tag,
  startDateFrom,
  dueDateTo,
  sort,
  onSearchInputChange,
  onSearch,
  onStatusChange,
  onPriorityChange,
  onTaskTypeChange,
  onTagChange,
  onStartDateFromChange,
  onDueDateToChange,
  onOverdueChange,
  onSortChange,
  basicExtra,
  advancedExtra,
  extraAdvancedCount = 0,
  compact = false,
  help,
  toolbarAction,
}: {
  searchInput: string;
  status: TaskStatusFilter;
  priority: string;
  taskType: string;
  overdue: string;
  tag: string;
  startDateFrom: string;
  dueDateTo: string;
  sort: string;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onStatusChange: (value: TaskStatusFilter) => void;
  onPriorityChange: (value: string) => void;
  onTaskTypeChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onStartDateFromChange: (value: string) => void;
  onDueDateToChange: (value: string) => void;
  onOverdueChange: (value: string) => void;
  onSortChange: (value: string) => void;
  basicExtra?: ReactNode;
  advancedExtra?: ReactNode;
  extraAdvancedCount?: number;
  compact?: boolean;
  help?: ReactNode;
  toolbarAction?: ReactNode;
}) {
  const advancedId = useId();
  const taskTypes = useTaskTypes();
  const keywordId = useId();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const advancedCount = [
    priority !== ALL_PRIORITIES,
    taskType !== ALL_TYPES,
    overdue !== ALL_OVERDUE,
    Boolean(tag),
    Boolean(startDateFrom),
    Boolean(dueDateTo),
  ].filter(Boolean).length;

  const advancedTrigger = (
    <Button
      type="button"
      variant={compact ? "outline" : "ghost"}
      size="sm"
      aria-expanded={isAdvancedOpen}
      aria-controls={advancedId}
      onClick={() => setIsAdvancedOpen((current) => !current)}
    >
      <SlidersHorizontalIcon data-icon="inline-start" aria-hidden="true" />
      {compact ? "絞り込み" : "詳細条件"}
      {compact && extraAdvancedCount
        ? `（${extraAdvancedCount}）`
        : !compact && advancedCount
          ? `（${advancedCount}件適用中）`
          : ""}
    </Button>
  );

  return (
    <div
      className="flex flex-col gap-2"
      onKeyDown={(event) => {
        if (compact && event.key === "Enter" && event.nativeEvent.isComposing)
          event.preventDefault();
      }}
    >
      {compact ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <form
              className="flex min-w-0 max-w-md flex-1 basis-56 items-center gap-1"
              aria-label="キーワード検索"
              onSubmit={(event) => {
                event.preventDefault();
                onSearch();
              }}
            >
              <Field className="min-w-0">
                <FieldLabel className="sr-only" htmlFor={keywordId}>
                  キーワード
                </FieldLabel>
                <Input
                  id={keywordId}
                  className="h-8"
                  value={searchInput}
                  placeholder="コード・名称・説明で検索"
                  onChange={(event) => onSearchInputChange(event.target.value)}
                />
              </Field>
              <Button
                type="submit"
                variant="outline"
                size="icon-sm"
                aria-label="検索"
                title="検索"
              >
                <SearchIcon />
              </Button>
            </form>
            {advancedTrigger}
            {toolbarAction}
            {help ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="絞り込みの使い方"
                  >
                    <CircleHelpIcon />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-80 max-w-[calc(100vw-2rem)]"
                >
                  <PopoverTitle>検索・絞り込みの使い方</PopoverTitle>
                  {help}
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
        </>
      ) : (
        <SearchFilterBar
          searchValue={searchInput}
          searchLabel="キーワード"
          searchPlaceholder="コード・名称・説明で検索"
          variant="compact"
          onSearchValueChange={onSearchInputChange}
          onSearch={onSearch}
        >
          <TaskStatusFilterControl value={status} onChange={onStatusChange} />
          {basicExtra}
          {!compact ? (
            <TaskFilterSelect
              label="並び順"
              value={sort}
              placeholder="並び順を選択"
              options={SORT_OPTIONS}
              onValueChange={onSortChange}
            />
          ) : null}
        </SearchFilterBar>
      )}
      {!compact ? <div className="self-start">{advancedTrigger}</div> : null}
      <FieldGroup
        id={advancedId}
        className={
          isAdvancedOpen
            ? compact
              ? "grid gap-3 border-y py-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid gap-3 border-t pt-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "hidden"
        }
      >
        {isAdvancedOpen && (
          <>
            {compact && (
              <>
                <TaskStatusFilterControl
                  value={status}
                  onChange={onStatusChange}
                />
                {basicExtra}
                <TaskFilterSelect
                  label="並び順"
                  value={sort}
                  placeholder="並び順を選択"
                  options={SORT_OPTIONS}
                  onValueChange={onSortChange}
                />
              </>
            )}
            {advancedExtra}
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
              options={taskTypes.options(
                taskType === ALL_TYPES ? undefined : taskType,
                true,
              )}
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
              <FieldLabel htmlFor="task-list-start-date-filter">
                開始日
              </FieldLabel>
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
          </>
        )}
      </FieldGroup>
    </div>
  );
}

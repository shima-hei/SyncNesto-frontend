"use client";

import { useState } from "react";
import { SlidersHorizontalIcon } from "lucide-react";

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
  BOARD_SWIMLANE_OPTIONS,
  SORT_OPTIONS,
} from "../../../constants/task-view-options";
import { TaskRequirementSelectField } from "../../forms/task-requirement-select-field";
import { TaskUserSelectField } from "../../forms/task-user-select-field";
import type { BoardSwimlane } from "../../sections/tasks-board-section";
import { TaskFilterSelect } from "./task-filter-select";

export function TaskBoardToolbar({
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
  swimlane,
  isCompletedCollapsed,
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
  onSwimlaneChange,
  onCompletedCollapsedChange,
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
  swimlane: BoardSwimlane;
  isCompletedCollapsed: boolean;
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
  onSwimlaneChange: (value: BoardSwimlane) => void;
  onCompletedCollapsedChange: (value: boolean) => void;
}) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
      <form
        className="grid gap-3 xl:grid-cols-[minmax(16rem,1.3fr)_minmax(10rem,0.8fr)_minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(12rem,1fr)_auto] xl:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <Field>
          <FieldLabel htmlFor="task-board-keyword">キーワード</FieldLabel>
          <Input
            id="task-board-keyword"
            value={searchInput}
            placeholder="タスクID、タイトル、説明"
            onChange={(event) => onSearchInputChange(event.target.value)}
          />
        </Field>
        <TaskFilterSelect
          label="ステータス"
          value={status}
          placeholder="ステータス"
          allValue={ALL_STATUSES}
          allLabel="すべて"
          options={TASK_STATUS_OPTIONS}
          onValueChange={onStatusChange}
        />
        <TaskUserSelectField
          projectId={projectId}
          label="担当者"
          value={assigneeId}
          placeholder="すべて"
          onChange={onAssigneeIdChange}
        />
        <Field>
          <FieldLabel htmlFor="task-board-tag">タグ</FieldLabel>
          <Input
            id="task-board-tag"
            value={tag}
            placeholder="タグ"
            onChange={(event) => onTagChange(event.target.value)}
          />
        </Field>
        <TaskFilterSelect
          label="スイムレーン"
          value={swimlane}
          placeholder="スイムレーン"
          options={BOARD_SWIMLANE_OPTIONS}
          onValueChange={(value) => onSwimlaneChange(value as BoardSwimlane)}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm">
            検索
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdvancedOpen((current) => !current)}
          >
            <SlidersHorizontalIcon data-icon="inline-start" />
            詳細条件
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onCompletedCollapsedChange(!isCompletedCollapsed)}
          >
            {isCompletedCollapsed ? "完了を表示" : "完了を隠す"}
          </Button>
        </div>
      </form>
      {isAdvancedOpen ? (
        <div className="grid gap-3 border-t pt-3 md:grid-cols-2 xl:grid-cols-6">
          <TaskFilterSelect
            label="優先度"
            value={priority}
            placeholder="優先度"
            allValue={ALL_PRIORITIES}
            allLabel="すべて"
            options={TASK_PRIORITY_OPTIONS}
            onValueChange={onPriorityChange}
          />
          <TaskFilterSelect
            label="種別"
            value={taskType}
            placeholder="種別"
            allValue={ALL_TYPES}
            allLabel="すべて"
            options={TASK_TYPE_OPTIONS}
            onValueChange={onTaskTypeChange}
          />
          <TaskFilterSelect
            label="期限"
            value={overdue}
            placeholder="期限"
            allValue={ALL_OVERDUE}
            allLabel="すべて"
            options={[{ value: "overdue", label: "期限超過" }]}
            onValueChange={onOverdueChange}
          />
          <TaskRequirementSelectField
            projectId={projectId}
            value={requirementId}
            placeholder="関連要件"
            onChange={onRequirementIdChange}
          />
          <Field>
            <FieldLabel htmlFor="task-board-start-date">開始日</FieldLabel>
            <Input
              id="task-board-start-date"
              type="date"
              value={startDateFrom}
              onChange={(event) => onStartDateFromChange(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="task-board-due-date">終了予定日</FieldLabel>
            <Input
              id="task-board-due-date"
              type="date"
              value={dueDateTo}
              onChange={(event) => onDueDateToChange(event.target.value)}
            />
          </Field>
          <TaskFilterSelect
            label="並び順"
            value={sort}
            placeholder="並び順"
            options={SORT_OPTIONS}
            onValueChange={onSortChange}
          />
        </div>
      ) : null}
    </div>
  );
}

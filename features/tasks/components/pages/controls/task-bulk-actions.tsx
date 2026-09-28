"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { TASK_STATUS_OPTIONS } from "../../../constants/task-options";
import { NO_BULK_STATUS_CHANGE } from "../../../constants/task-view-options";
import { TaskUserSelectField } from "../../forms/task-user-select-field";

export function TaskBulkActions({
  projectId,
  selectedCount,
  status,
  assigneeId,
  dueDate,
  isPending,
  disabled,
  onStatusChange,
  onAssigneeIdChange,
  onDueDateChange,
  onApply,
  onClearSelection,
}: {
  projectId: number;
  selectedCount: number;
  status: string;
  assigneeId: string;
  dueDate: string;
  isPending: boolean;
  disabled: boolean;
  onStatusChange: (value: string) => void;
  onAssigneeIdChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onApply: () => Promise<void>;
  onClearSelection: () => void;
}) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <section
      aria-label="選択したタスクの一括更新"
      className="flex flex-col gap-3 border-y bg-muted/30 px-3 py-3"
    >
      <h2 className="text-sm font-semibold">
        一括更新（{selectedCount}件選択中）
      </h2>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="bulk-task-status">ステータス</Label>
            <Select value={status} onValueChange={onStatusChange}>
              <SelectTrigger id="bulk-task-status" className="w-full">
                <SelectValue placeholder="変更しない" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={NO_BULK_STATUS_CHANGE}>
                    変更しない
                  </SelectItem>
                  {TASK_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <TaskUserSelectField
            projectId={projectId}
            label="担当者"
            value={assigneeId}
            placeholder="変更しない"
            onChange={onAssigneeIdChange}
          />
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="bulk-due-date">終了予定日</Label>
            <Input
              id="bulk-due-date"
              type="date"
              value={dueDate}
              onChange={(event) => onDueDateChange(event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={disabled || isPending}
            onClick={() => void onApply()}
          >
            一括更新
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selectedCount || isPending}
            onClick={onClearSelection}
          >
            選択解除
          </Button>
        </div>
      </div>
    </section>
  );
}

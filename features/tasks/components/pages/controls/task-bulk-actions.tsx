"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">一括更新</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <p className="text-sm text-muted-foreground lg:w-28">
          選択中: {selectedCount}件
        </p>
        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-2">
            <Label>ステータス</Label>
            <Select value={status} onValueChange={onStatusChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="変更しない" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={NO_BULK_STATUS_CHANGE}>変更しない</SelectItem>
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
            disabled={disabled || isPending}
            onClick={() => void onApply()}
          >
            一括更新
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!selectedCount || isPending}
            onClick={onClearSelection}
          >
            選択解除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

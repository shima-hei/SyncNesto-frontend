"use client";

import Link from "next/link";
import { CopyIcon } from "lucide-react";

import { ClickableTableRow } from "@/components/shared/tables/clickable-table-row";
import { TableEmptyRow } from "@/components/shared/tables/table-empty-row";
import { TableListSkeleton } from "@/components/shared/tables/table-list-skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TaskRead } from "@/lib/api/generated/model";
import { formatDate } from "@/lib/format/date";

import { TASK_STATUS_OPTIONS } from "../../constants/task-options";
import { useDuplicateTask } from "../../hooks/use-duplicate-task";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { useUpdateTaskStatus } from "../../hooks/use-update-task-status";
import {
  TaskFlagBadges,
  TaskRequirementBadges,
  TaskStatusBadge,
  TaskTags,
  TaskTypeBadge,
} from "../shared/task-badges";

type TasksTableProps = {
  projectId: number;
  tasks: TaskRead[];
  isLoading: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  selectedTaskIds: number[];
  onToggleTask: (taskId: number, checked: boolean) => void;
  onToggleAllTasks: (checked: boolean) => void;
};

export function TasksTable({
  projectId,
  tasks,
  isLoading,
  canCreate,
  canUpdate,
  selectedTaskIds,
  onToggleTask,
  onToggleAllTasks,
}: TasksTableProps) {
  const { updateTaskStatus, isPending } = useUpdateTaskStatus(projectId);
  const { duplicateTask, isPending: isDuplicatePending } =
    useDuplicateTask(projectId);
  const { getTaskUserLabel } = useTaskUserMap(projectId);
  const isAllVisibleSelected =
    Boolean(tasks.length) &&
    tasks.every((task) => selectedTaskIds.includes(task.id));
  const isSomeVisibleSelected = tasks.some((task) =>
    selectedTaskIds.includes(task.id),
  );
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const selectionState = isAllVisibleSelected
    ? true
    : isSomeVisibleSelected
      ? "indeterminate"
      : false;

  if (isLoading) {
    return <TableListSkeleton widths={["w-56", "w-20", "w-24", "w-32"]} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {canUpdate ? (
            <TableHead className="w-10">
              <Checkbox
                aria-label="表示中のタスクを選択"
                checked={selectionState}
                onCheckedChange={(checked) =>
                  onToggleAllTasks(checked === true)
                }
              />
            </TableHead>
          ) : null}
          <TableHead>タスク</TableHead>
          <TableHead>種別</TableHead>
          <TableHead>担当</TableHead>
          <TableHead>状態</TableHead>
          <TableHead>開始日</TableHead>
          <TableHead>終了予定日</TableHead>
          <TableHead>進捗</TableHead>
          <TableHead>関連要件</TableHead>
          <TableHead>タグ</TableHead>
          <TableHead>親タスク</TableHead>
          {canCreate ? <TableHead className="w-24">操作</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.length ? (
          tasks.map((task) => (
            <ClickableTableRow
              key={task.id}
              href={`/projects/joined/${projectId}/tasks/${task.id}`}
            >
              {canUpdate ? (
                <TableCell
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <Checkbox
                    aria-label={`${task.title}を選択`}
                    checked={selectedTaskIds.includes(task.id)}
                    onCheckedChange={(checked) =>
                      onToggleTask(task.id, checked === true)
                    }
                  />
                </TableCell>
              ) : null}
              <TableCell>
                <div className="flex min-w-64 flex-col gap-1">
                  <span className="truncate font-medium">{task.title}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {task.task_code}
                    </span>
                    <TaskFlagBadges
                      isOverdue={task.is_overdue}
                      isBlocked={task.is_blocked}
                    />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <TaskTypeBadge type={task.task_type} />
              </TableCell>
              <TableCell>{getTaskUserLabel(task.assignee_id)}</TableCell>
              <TableCell>
                {canUpdate ? (
                  <div
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <Select
                      value={task.status ?? "todo"}
                      disabled={isPending}
                      onValueChange={(status) =>
                        updateTaskStatus(task, status).catch(() => undefined)
                      }
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {TASK_STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <TaskStatusBadge status={task.status} />
                )}
              </TableCell>
              <TableCell>{formatDate(task.start_date)}</TableCell>
              <TableCell>{formatDate(task.due_date)}</TableCell>
              <TableCell>{task.progress_percent ?? 0}%</TableCell>
              <TableCell>
                <TaskRequirementBadges requirements={task.requirements} />
              </TableCell>
              <TableCell>
                <TaskTags tags={task.tags} />
              </TableCell>
              <TableCell>
                {task.parent_task_id ? (
                  <span className="text-xs text-muted-foreground">
                    {getParentTaskLabel(
                      task.parent_task_id,
                      tasksById.get(task.parent_task_id),
                    )}
                  </span>
                ) : (
                  "-"
                )}
              </TableCell>
              {canCreate ? (
                <TableCell
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isDuplicatePending}
                    onClick={() => duplicateTask(task).catch(() => undefined)}
                  >
                    <CopyIcon data-icon="inline-start" />
                    複製
                  </Button>
                </TableCell>
              ) : null}
            </ClickableTableRow>
          ))
        ) : (
          <TableEmptyRow
            colSpan={(canUpdate ? 1 : 0) + 10 + (canCreate ? 1 : 0)}
            message="条件に一致するタスクがありません。"
          />
        )}
      </TableBody>
    </Table>
  );
}

export function TaskDetailLink({
  projectId,
  task,
}: {
  projectId: number;
  task: TaskRead;
}) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={`/projects/joined/${projectId}/tasks/${task.id}`}>詳細</Link>
    </Button>
  );
}

const getParentTaskLabel = (parentTaskId: number, parentTask?: TaskRead) => {
  if (!parentTask) {
    return `親: ${parentTaskId}`;
  }

  return `${parentTask.task_code} ${parentTask.title}`;
};

"use client";

import Link from "next/link";
import { useListNavigation } from "@/hooks/use-list-navigation";
import { useTaskOrigin } from "@/hooks/use-task-origin";
import { CopyIcon, ListTreeIcon } from "lucide-react";

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
import { useUrlFilterState } from "@/hooks/use-url-filter-state";

import { TASK_STATUS_OPTIONS } from "../../constants/task-options";
import { useDuplicateTask } from "../../hooks/use-duplicate-task";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { useUpdateTaskStatus } from "../../hooks/use-update-task-status";
import { getTaskParentSummary } from "../../lib/task-list-scope";
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
  onBrowseChildren: (taskId: number) => void;
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
  onBrowseChildren,
}: TasksTableProps) {
  const [columns, setColumns] = useUrlFilterState("taskColumns", "summary");
  const showDetails = columns === "details";
  const { withReturn } = useListNavigation(
    `/projects/joined/${projectId}/tasks`,
  );
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
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          名称の下に親タスクを表示します。列が収まらない場合は横にスクロールできます。
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={showDetails}
          onClick={() => setColumns(showDetails ? "summary" : "details")}
        >
          {showDetails ? "基本の列に戻す" : "詳細の列を表示"}
        </Button>
      </div>
      <Table className="min-w-[48rem]">
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
            {showDetails ? <TableHead>種別</TableHead> : null}
            <TableHead>担当</TableHead>
            <TableHead>状態</TableHead>
            {showDetails ? <TableHead>開始日</TableHead> : null}
            <TableHead>終了予定日</TableHead>
            <TableHead>進捗</TableHead>
            {showDetails ? <TableHead>関連要件</TableHead> : null}
            {showDetails ? <TableHead>タグ</TableHead> : null}
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length ? (
            tasks.map((task) => {
              const parent = getTaskParentSummary(task, tasksById);
              return (
                <ClickableTableRow
                  key={task.id}
                  href={withReturn(
                    `/projects/joined/${projectId}/tasks/${task.id}`,
                  )}
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
                  <TableCell className="min-w-64 max-w-md whitespace-normal">
                    <div className="flex min-w-0 flex-col gap-1">
                      <Link
                        href={withReturn(
                          `/projects/joined/${projectId}/tasks/${task.id}`,
                        )}
                        className="min-w-0 break-words rounded-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        {task.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {task.task_code} · ID: {task.id}
                        </span>
                        <TaskFlagBadges
                          isOverdue={task.is_overdue}
                          isBlocked={task.is_blocked}
                        />
                      </div>
                      {task.parent_task_id ? (
                        <Link
                          href={withReturn(
                            `/projects/joined/${projectId}/tasks/${task.parent_task_id}`,
                          )}
                          className="break-words text-xs text-muted-foreground hover:underline"
                        >
                          親: {parent?.title ?? "名称を確認できません"}
                          <span className="ml-1">
                            （
                            {parent?.task_code ? `${parent.task_code} · ` : ""}
                            ID: {task.parent_task_id}）
                          </span>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          親タスクなし
                        </span>
                      )}
                    </div>
                  </TableCell>
                  {showDetails ? (
                    <TableCell>
                      <TaskTypeBadge type={task.task_type} />
                    </TableCell>
                  ) : null}
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
                            updateTaskStatus(task, status).catch(
                              () => undefined,
                            )
                          }
                        >
                          <SelectTrigger
                            className="h-8 w-32"
                            aria-label={`${task.title}の状態を変更`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {TASK_STATUS_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
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
                  {showDetails ? (
                    <TableCell className="tabular-nums">
                      {formatDate(task.start_date)}
                    </TableCell>
                  ) : null}
                  <TableCell className="tabular-nums">
                    {formatDate(task.due_date)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {task.progress_percent ?? 0}%
                  </TableCell>
                  {showDetails ? (
                    <TableCell>
                      <TaskRequirementBadges requirements={task.requirements} />
                    </TableCell>
                  ) : null}
                  {showDetails ? (
                    <TableCell>
                      <TaskTags tags={task.tags} />
                    </TableCell>
                  ) : null}
                  <TableCell
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={`${task.title}の子を見る`}
                        onClick={() => onBrowseChildren(task.id)}
                      >
                        <ListTreeIcon data-icon="inline-start" />
                        子を見る
                      </Button>
                      {canCreate ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isDuplicatePending}
                          onClick={() =>
                            duplicateTask(task).catch(() => undefined)
                          }
                        >
                          <CopyIcon data-icon="inline-start" />
                          複製
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </ClickableTableRow>
              );
            })
          ) : (
            <TableEmptyRow
              colSpan={(canUpdate ? 1 : 0) + 6 + (showDetails ? 4 : 0)}
              message="条件に一致するタスクがありません。"
            />
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function TaskDetailLink({
  projectId,
  task,
}: {
  projectId: number;
  task: TaskRead;
}) {
  const { withOrigin } = useTaskOrigin(projectId);
  const { withReturn } = useListNavigation(
    `/projects/joined/${projectId}/tasks`,
  );
  return (
    <Button asChild variant="outline" size="sm">
      <Link
        href={withOrigin(
          withReturn(`/projects/joined/${projectId}/tasks/${task.id}`),
        )}
      >
        詳細
      </Link>
    </Button>
  );
}

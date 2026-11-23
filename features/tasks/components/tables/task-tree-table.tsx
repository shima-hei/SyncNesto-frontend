"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronRightIcon, EllipsisIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskEditableSection } from "../forms/task-editable-section";
import {
  getTaskPriorityLabel,
  getTaskTypeLabel,
} from "../../constants/task-options";
import type { TaskEditSection } from "../../lib/task-mappers";
import {
  TASK_LIST_COLUMNS,
  type TaskListColumn,
} from "../../lib/task-list-columns";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { TableEmptyRow } from "@/components/shared/tables/table-empty-row";
import { formatDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import type { TaskTreeRow } from "../../lib/task-tree";
import { getTaskParentSummary } from "../../lib/task-list-scope";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { TaskAssignee } from "../shared/task-assignee";
import { TaskPhaseCell } from "../shared/task-phase-cell";
import { usePlanningPhases } from "../../hooks/use-planning-phases";
import {
  TaskStatusBadge,
  TaskRequirementBadges,
  TaskTags,
} from "../shared/task-badges";

type Props = {
  projectId: number;
  rows: TaskTreeRow[];
  expanded: Set<number>;
  contextIds: number[];
  filtered: boolean;
  canUpdate: boolean;
  selectedIds: number[];
  activeId: number | null;
  columns: TaskListColumn[];
  createRow?: ReactNode;
  emptyMessage?: string;
  detailHref: (id: number) => string;
  onNavigate: (id: number) => void;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
  onContext: (id: number) => void;
  onMore: (id: number) => void;
  onRetry: (id: number) => void;
  onCheck: (id: number, checked: boolean) => void;
  onCheckAll: (checked: boolean) => void;
};
export function TaskTreeTable({
  projectId,
  rows,
  expanded,
  contextIds,
  filtered,
  canUpdate,
  selectedIds,
  activeId,
  columns,
  createRow,
  emptyMessage = "表示できるタスクがありません。",
  detailHref,
  onNavigate,
  onSelect,
  onToggle,
  onContext,
  onMore,
  onRetry,
  onCheck,
  onCheckAll,
}: Props) {
  const phases = usePlanningPhases(projectId);
  const { usersById } = useTaskUserMap(projectId);
  const moreFocusRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const id = moreFocusRef.current;
    if (id === null || document.querySelector(`[data-tree-more="${id}"]`))
      return;
    if (document.activeElement === document.body) {
      const last = rows
        .filter((row) => row.kind === "task" && row.task.parent_task_id === id)
        .at(-1);
      if (last?.kind === "task")
        document
          .querySelector<HTMLButtonElement>(
            `[data-task-select="${last.task.id}"]`,
          )
          ?.focus({ preventScroll: true });
    }
    moreFocusRef.current = null;
  }, [rows]);
  const matches = rows.filter(
    (row): row is Extract<TaskTreeRow, { kind: "task" }> =>
      row.kind === "task" && row.source === "match",
  );
  const checkedCount = matches.filter((row) =>
    selectedIds.includes(row.task.id),
  ).length;
  const columnCount = 2 + Number(canUpdate) + columns.length;
  const tasksById = new Map(
    rows
      .filter(
        (row): row is Extract<TaskTreeRow, { kind: "task" }> =>
          row.kind === "task",
      )
      .map((row) => [row.task.id, row.task]),
  );
  return (
    <div
      role="region"
      aria-label="タスク表"
      tabIndex={0}
      className="@container/task-table min-w-0 overflow-x-auto focus-visible:outline-2 focus-visible:outline-ring [&>[data-slot=table-container]]:overflow-visible"
    >
      <Table className="[&_th]:h-9">
        <TableCaption className="sr-only">
          タスク一覧。矢印で子タスクを展開し、タスク名で詳細を開きます。
        </TableCaption>
        <TableHeader>
          <TableRow>
            {canUpdate ? (
              <TableHead scope="col" className="w-10">
                <Checkbox
                  aria-label="表示中の一致タスクをまとめて選択"
                  checked={
                    matches.length > 0 && checkedCount === matches.length
                      ? true
                      : checkedCount > 0
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(value) => onCheckAll(value === true)}
                />
              </TableHead>
            ) : null}
            <TableHead scope="col" className="min-w-56">
              タスク名
            </TableHead>
            {TASK_LIST_COLUMNS.filter((column) =>
              columns.includes(column.key),
            ).map((column) => (
              <TableHead scope="col" key={column.key}>
                {column.label}
              </TableHead>
            ))}
            <TableHead scope="col" className="w-10">
              <span className="sr-only">操作</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {createRow && (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columnCount}
                className="p-0 whitespace-normal"
              >
                <div className="max-w-[100cqw]">{createRow}</div>
              </TableCell>
            </TableRow>
          )}
          {!rows.length ? (
            <TableEmptyRow colSpan={columnCount} message={emptyMessage} />
          ) : (
            rows.map((row) => {
              if (row.kind !== "task")
                return (
                  <TableRow key={`branch-${row.parentId}`}>
                    <TableCell
                      colSpan={columnCount}
                      className="whitespace-normal"
                    >
                      <div
                        className="flex flex-wrap items-center gap-3"
                        style={{ paddingLeft: Math.min(row.depth, 6) * 16 }}
                      >
                        <span
                          role={row.kind === "error" ? "alert" : "status"}
                          className="text-xs text-muted-foreground"
                        >
                          {row.kind === "loading"
                            ? "子を読み込んでいます…"
                            : row.kind === "error"
                              ? "子を取得できませんでした。表示中の内容を保持しています。"
                              : `直属の子 ${row.shown} / ${row.total}件`}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          data-tree-more={row.parentId}
                          onFocus={() => {
                            moreFocusRef.current = row.parentId;
                          }}
                          aria-disabled={row.kind === "loading"}
                          onClick={() => {
                            if (row.kind === "error") onRetry(row.parentId);
                            else if (row.kind === "more") onMore(row.parentId);
                          }}
                        >
                          {row.kind === "loading"
                            ? "読み込み中…"
                            : row.kind === "error"
                              ? "子の取得を再試行"
                              : "次の子を表示"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              const { task, source, depth } = row;
              const parent = getTaskParentSummary(task, tasksById);
              const editable = canUpdate && source === "match";
              const edit = (
                section: TaskEditSection,
                label: string,
                value: ReactNode,
              ) =>
                editable ? (
                  <TaskEditableSection
                    presentation="popover"
                    task={task}
                    section={section}
                    label={label}
                    canUpdate
                  >
                    {value}
                  </TaskEditableSection>
                ) : (
                  value
                );
              const cells: Record<TaskListColumn, ReactNode> = {
                status: edit(
                  "status",
                  "ステータスを編集",
                  <TaskStatusBadge status={task.status} />,
                ),
                assignee: edit(
                  "assignee",
                  "担当者を編集",
                  <TaskAssignee
                    userId={task.assignee_id}
                    user={
                      task.assignee_id
                        ? usersById.get(task.assignee_id)
                        : undefined
                    }
                  />,
                ),
                due: (
                  <>
                    {edit(
                      "dueDate",
                      "終了予定日を編集",
                      formatDate(task.due_date),
                    )}
                    {task.is_overdue && (
                      <span className="ml-1 text-xs text-warning">
                        期限超過
                      </span>
                    )}
                  </>
                ),
                phase: (
                  <TaskPhaseCell
                    task={task}
                    quiet
                    phases={phases.data ?? []}
                    editable={editable && phases.isSuccess}
                  />
                ),
                priority: edit(
                  "priority",
                  "優先度を編集",
                  getTaskPriorityLabel(task.priority),
                ),
                start: edit(
                  "startDate",
                  "開始日を編集",
                  formatDate(task.start_date),
                ),
                progress: edit(
                  "progress",
                  "進捗率を編集",
                  `${task.progress_percent ?? 0}%`,
                ),
                type: edit(
                  "type",
                  "種別を編集",
                  getTaskTypeLabel(task.task_type, task.task_type_name),
                ),
                requirements: (
                  <TaskRequirementBadges requirements={task.requirements} />
                ),
                tags: <TaskTags tags={task.tags} />,
              };
              return (
                <TableRow
                  key={task.id}
                  data-task-id={task.id}
                  data-task-source={source}
                  data-state={activeId === task.id ? "selected" : undefined}
                  className={cn(
                    "cursor-pointer",
                    source !== "match" && "bg-muted/30",
                  )}
                  onClick={(event) => {
                    const target = event.target;
                    if (
                      !(target instanceof Element) ||
                      !event.currentTarget.contains(target) ||
                      target.closest(
                        'button,a,input,select,textarea,label,[role="checkbox"],[role="combobox"],[role="menuitem"]',
                      ) ||
                      event.defaultPrevented ||
                      event.button !== 0 ||
                      event.altKey ||
                      event.ctrlKey ||
                      event.metaKey ||
                      event.shiftKey ||
                      window.getSelection()?.type === "Range"
                    )
                      return;
                    onNavigate(task.id);
                  }}
                >
                  {canUpdate ? (
                    <TableCell>
                      <Checkbox
                        aria-label={`${task.title}を複数選択`}
                        disabled={source !== "match"}
                        checked={selectedIds.includes(task.id)}
                        onCheckedChange={(value) =>
                          onCheck(task.id, value === true)
                        }
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="min-w-64 max-w-xl whitespace-normal">
                    <div
                      className="flex items-start gap-1"
                      style={{ paddingLeft: Math.min(depth, 6) * 16 }}
                    >
                      {task.has_children ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          data-tree-expand={task.id}
                          aria-expanded={expanded.has(task.id)}
                          aria-label={`${task.title}の子を${expanded.has(task.id) ? "折り畳む" : "展開する"}`}
                          onClick={() => onToggle(task.id)}
                        >
                          {expanded.has(task.id) ? (
                            <ChevronDownIcon />
                          ) : (
                            <ChevronRightIcon />
                          )}
                        </Button>
                      ) : (
                        <span className="w-7 shrink-0" aria-hidden="true" />
                      )}
                      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                        <Link
                          href={detailHref(task.id)}
                          className="min-w-0 font-medium break-words underline-offset-4 hover:underline focus-visible:underline"
                          data-task-select={task.id}
                          onNavigate={(event) => {
                            event.preventDefault();
                            onNavigate(task.id);
                          }}
                        >
                          {task.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{task.task_code}</span>
                          {depth > 6 && <span>深さ{depth + 1}</span>}
                          {source !== "match" && (
                            <span>
                              {source === "outside"
                                ? "検索条件外"
                                : source === "other-match"
                                  ? "別ページの一致"
                                  : "親子の文脈"}
                            </span>
                          )}
                        </div>
                        {filtered && task.parent_task_id ? (
                          parent ? (
                            <Link
                              href={detailHref(parent.id)}
                              className="break-words text-xs hover:underline"
                              onNavigate={(event) => {
                                event.preventDefault();
                                onNavigate(parent.id);
                              }}
                            >
                              親：{parent.title}
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              親の名称を確認できません
                            </span>
                          )
                        ) : null}
                        {filtered && source === "match" ? (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0"
                            aria-label={`${task.title}の${contextIds.includes(task.id) ? "文脈を閉じる" : "親子を表示"}`}
                            onClick={() => onContext(task.id)}
                          >
                            {contextIds.includes(task.id)
                              ? "文脈を閉じる"
                              : "親子を表示"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell key={column} className="tabular-nums">
                      {cells[column]}
                    </TableCell>
                  ))}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`${task.title}の操作`}
                        >
                          <EllipsisIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onSelect(task.id)}>
                          {canUpdate
                            ? "クイック編集（右ペイン）"
                            : "クイック表示（右ペイン）"}
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={detailHref(task.id)}
                            onNavigate={(event) => {
                              event.preventDefault();
                              onNavigate(task.id);
                            }}
                          >
                            詳細を開く
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

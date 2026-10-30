"use client";

import { Fragment, useLayoutEffect, useRef } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { TaskRead } from "@/lib/api/generated/model";
import type { TaskTreeRow } from "../../lib/task-tree";
import { getTaskParentSummary } from "../../lib/task-list-scope";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { TaskHierarchyBadge } from "../shared/task-hierarchy-badge";
import {
  TaskStatusBadge,
  TaskPriorityBadge,
  TaskTypeBadge,
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
  showDetails: boolean;
  showProgress: boolean;
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
  showDetails,
  showProgress,
  onSelect,
  onToggle,
  onContext,
  onMore,
  onRetry,
  onCheck,
  onCheckAll,
}: Props) {
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
  const label = (task: TaskRead) =>
    task.assignee_id
      ? (usersById.get(task.assignee_id)?.name ?? "担当者を確認できません")
      : "未割当";
  const matches = rows.filter(
    (row): row is Extract<TaskTreeRow, { kind: "task" }> =>
      row.kind === "task" && row.source === "match",
  );
  const checkedCount = matches.filter((row) =>
    selectedIds.includes(row.task.id),
  ).length;
  const columns =
    4 + Number(canUpdate) + Number(showProgress) + (showDetails ? 5 : 0);
  const tasksById = new Map(
    rows
      .filter(
        (row): row is Extract<TaskTreeRow, { kind: "task" }> =>
          row.kind === "task",
      )
      .map((row) => [row.task.id, row.task]),
  );
  return (
    <Table className="min-w-[43rem]">
      <TableCaption className="sr-only">
        タスク一覧。矢印で親子を展開、名称で簡易詳細、チェックで複数選択します。
      </TableCaption>
      <TableHeader>
        <TableRow>
          {canUpdate ? (
            <TableHead className="w-10">
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
          <TableHead className="min-w-64">タスク</TableHead>
          <TableHead>状態</TableHead>
          <TableHead>担当</TableHead>
          <TableHead>期限</TableHead>
          {showProgress ? <TableHead>進捗</TableHead> : null}
          {showDetails ? (
            <>
              <TableHead>優先度</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>開始日</TableHead>
              <TableHead>関連要件</TableHead>
              <TableHead>タグ</TableHead>
            </>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {!rows.length ? (
          <TableEmptyRow
            colSpan={columns}
            message="表示できるタスクがありません。検索条件や閲覧範囲を確認してください。"
          />
        ) : (
          rows.map((row) => {
            if (row.kind !== "task")
              return (
                <TableRow key={`branch-${row.parentId}`}>
                  <TableCell colSpan={columns} className="whitespace-normal">
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
            return (
              <Fragment key={task.id}>
                <TableRow
                  data-task-id={task.id}
                  data-task-source={source}
                  data-state={activeId === task.id ? "selected" : undefined}
                  className={cn(
                    "cursor-pointer",
                    source !== "match" && "bg-muted/30",
                  )}
                  onClick={(event) => {
                    if (
                      !(event.target as HTMLElement).closest(
                        'button,a,input,[role="checkbox"],[role="combobox"]',
                      )
                    )
                      onSelect(task.id);
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
                        <Button
                          variant="link"
                          className="h-auto min-w-0 justify-start whitespace-normal p-0 text-left break-words"
                          data-task-select={task.id}
                          onClick={() => onSelect(task.id)}
                        >
                          {task.title}
                        </Button>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{task.task_code}</span>
                          {(!task.has_children && !task.parent_task_id) ||
                          showDetails ? (
                            <TaskHierarchyBadge task={task} />
                          ) : null}
                          {depth > 6 ? <span>深さ{depth + 1}</span> : null}
                          {source === "outside" ? (
                            <Badge variant="outline">検索条件外</Badge>
                          ) : source === "other-match" ? (
                            <Badge variant="outline">
                              別ページの一致・文脈表示
                            </Badge>
                          ) : source === "context" ? (
                            <Badge variant="outline">
                              親子の文脈・一致件数の対象外
                            </Badge>
                          ) : null}
                        </div>
                        {filtered && task.parent_task_id ? (
                          parent ? (
                            <Button
                              variant="link"
                              className="h-auto min-w-0 whitespace-normal p-0 text-left break-words"
                              onClick={() => onSelect(parent.id)}
                            >
                              親：{parent.title}
                            </Button>
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
                  <TableCell>
                    <TaskStatusBadge status={task.status} />
                  </TableCell>
                  <TableCell>{label(task)}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatDate(task.due_date)}
                    {task.is_overdue ? (
                      <p className="text-xs text-warning">期限超過</p>
                    ) : null}
                  </TableCell>
                  {showProgress ? (
                    <TableCell>{task.progress_percent ?? 0}%</TableCell>
                  ) : null}
                  {showDetails ? (
                    <>
                      <TableCell>
                        <TaskPriorityBadge priority={task.priority} />
                      </TableCell>
                      <TableCell>
                        <TaskTypeBadge type={task.task_type} />
                      </TableCell>
                      <TableCell>{formatDate(task.start_date)}</TableCell>
                      <TableCell>
                        <TaskRequirementBadges
                          requirements={task.requirements}
                        />
                      </TableCell>
                      <TableCell>
                        <TaskTags tags={task.tags} />
                      </TableCell>
                    </>
                  ) : null}
                </TableRow>
              </Fragment>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

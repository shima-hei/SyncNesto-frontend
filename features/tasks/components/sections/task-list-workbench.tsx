"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TaskListDraftNotice } from "./task-list-quick-edit";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { LoadingState } from "@/components/shared/feedback/loading-state";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { useUrlFilterState } from "@/hooks/use-url-filter-state";
import { useTaskOrigin } from "@/hooks/use-task-origin";
import { withListReturn } from "@/lib/navigation/list-return";
import { cn } from "@/lib/utils";
import type { ListTasksProjectsProjectIdTasksGetParams } from "@/lib/api/generated/model";
import { useTasks } from "../../hooks/use-tasks";
import { useTaskTree } from "../../hooks/use-task-tree";
import { useBulkUpdateTasks } from "../../hooks/use-bulk-update-tasks";
import { taskQueryHasFilters } from "../../lib/task-tree";
import { NO_BULK_STATUS_CHANGE } from "../../constants/task-view-options";
import { TaskBulkActions } from "../pages/controls/task-bulk-actions";
import { TasksTable } from "../tables/tasks-table";
import { TaskTreeTable } from "../tables/task-tree-table";
import { TaskListDetailPanel } from "./task-list-detail-panel";
import { useTaskListEditing } from "../../hooks/use-task-list-editing";
import { TaskListEditDialogs } from "./task-list-edit-dialogs";

export function TaskListWorkbench({
  projectId,
  query,
  legacy,
  canCreate,
  canUpdate,
  onPageChange,
  onBrowseChildren,
  navigationGuardRef,
  enabled,
  selectionResetRef,
}: {
  projectId: number;
  query: ListTasksProjectsProjectIdTasksGetParams;
  legacy: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  onPageChange: (page: number) => void;
  onBrowseChildren: (id: number) => void;
  navigationGuardRef: RefObject<(action: () => void) => void>;
  enabled: boolean;
  selectionResetRef: RefObject<() => void>;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const { withOrigin } = useTaskOrigin(projectId);
  const filtered = taskQueryHasFilters(query);
  const rootOnly =
    !legacy && !filtered && query.parent_task_id == null
      ? true
      : query.root_only;
  const {
    tasks,
    total,
    isLoading,
    isFetching,
    isPlaceholderData,
    error,
    refetch,
  } = useTasks(projectId, { ...query, root_only: rootOnly }, enabled);
  const tree = useTaskTree(
    projectId,
    isPlaceholderData || error ? [] : tasks,
    query,
    filtered,
    enabled && !legacy && !isLoading && !isPlaceholderData && !error,
  );
  const [activeId, setActiveId] = useUrlFilterState<number | null>(
    "taskSelection",
    null,
  );
  const [columns, setColumns] = useUrlFilterState("taskColumns", "summary");
  const [progress, setProgress] = useUrlFilterState("taskProgress", "shown");
  const editor = useTaskListEditing(projectId, activeId);
  useEffect(() => {
    navigationGuardRef.current = editor.guard;
    return () => {
      navigationGuardRef.current = (action) => action();
    };
  }, [editor.guard, navigationGuardRef]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  useEffect(() => {
    selectionResetRef.current = () => setSelectedIds([]);
    return () => {
      selectionResetRef.current = () => {};
    };
  }, [selectionResetRef]);
  const [bulkStatus, setBulkStatus] = useState(NO_BULK_STATUS_CHANGE);
  const [bulkAssigneeId, setBulkAssigneeId] = useState("");
  const [bulkDueDate, setBulkDueDate] = useState("");
  const { bulkUpdateTasks, isPending } = useBulkUpdateTasks(projectId);
  const taskRows = tree.rows.filter((row) => row.kind === "task");
  const selectable = legacy
    ? tasks
    : taskRows.filter((row) => row.source === "match").map((row) => row.task);
  const selected = selectable.filter((task) => selectedIds.includes(task.id));
  const outside = selectedIds.length - selected.length;
  const contextCount = taskRows.filter((row) => row.source !== "match").length;
  const lastActive = useRef(activeId);
  const region = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const scroll = params.get("taskScroll");
  useEffect(() => {
    if (
      !restored.current &&
      !isLoading &&
      !isPlaceholderData &&
      !tree.parentLoading &&
      !tree.rows.some((row) => row.kind === "loading")
    ) {
      const value = Number(scroll);
      if (scroll && Number.isFinite(value) && value >= 0)
        window.scrollTo({
          top: Math.min(value, 1_000_000),
          behavior: "instant",
        });
      restored.current = true;
    }
  }, [isLoading, isPlaceholderData, tree.parentLoading, tree.rows, scroll]);
  const restoreFocus = () => {
    const target = document.querySelector<HTMLButtonElement>(
      `[data-task-select="${lastActive.current}"]`,
    );
    (target ?? region.current)?.focus({ preventScroll: true });
  };
  const closePanel = () => {
    editor.guard(() => {
      lastActive.current = activeId;
      setActiveId(null);
      requestAnimationFrame(restoreFocus);
    });
  };
  const selectTask = (id: number) => {
    if (activeId === id) return;
    editor.guard(() => {
      lastActive.current = id;
      setActiveId(id);
    });
  };
  const check = (id: number, checked: boolean) =>
    setSelectedIds((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((value) => value !== id),
    );
  const checkAll = (checked: boolean) =>
    setSelectedIds((current) =>
      checked
        ? [...new Set([...current, ...selectable.map((task) => task.id)])]
        : current.filter((id) => !selectable.some((task) => task.id === id)),
    );
  const openFull = (id: number) => {
    editor.guard(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("taskScroll", String(Math.round(window.scrollY)));
      window.history.replaceState(
        null,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
      router.push(
        withOrigin(
          withListReturn(
            `/projects/joined/${projectId}/tasks/${id}`,
            `${url.pathname}${url.search}`,
          ),
        ),
      );
    });
  };
  const bulkApply = async () => {
    await bulkUpdateTasks(selected, {
      status: bulkStatus === NO_BULK_STATUS_CHANGE ? undefined : bulkStatus,
      assigneeId: bulkAssigneeId || undefined,
      dueDate: bulkDueDate || undefined,
    });
    setSelectedIds([]);
    setBulkStatus(NO_BULK_STATUS_CHANGE);
    setBulkAssigneeId("");
    setBulkDueDate("");
  };
  const busy = isLoading || isPlaceholderData;
  return (
    <div
      className={cn(
        "grid min-w-0 items-start gap-4",
        !legacy && activeId && "xl:grid-cols-[minmax(0,1fr)_22rem]",
      )}
    >
      <div
        ref={region}
        tabIndex={-1}
        aria-label="タスク一覧"
        className="flex min-w-0 flex-col gap-3"
      >
        {!activeId || legacy || error ? (
          <TaskListDraftNotice editor={editor} />
        ) : null}
        {canUpdate && !busy && !error ? (
          <TaskBulkActions
            projectId={projectId}
            selectedCount={selected.length}
            status={bulkStatus}
            assigneeId={bulkAssigneeId}
            dueDate={bulkDueDate}
            isPending={isPending}
            disabled={
              !selected.length ||
              !(
                bulkStatus !== NO_BULK_STATUS_CHANGE ||
                bulkAssigneeId ||
                bulkDueDate
              )
            }
            onStatusChange={setBulkStatus}
            onAssigneeIdChange={setBulkAssigneeId}
            onDueDateChange={setBulkDueDate}
            onApply={() => bulkApply().catch(() => undefined)}
            onClearSelection={() => setSelectedIds([])}
          />
        ) : null}
        {!error && outside > 0 ? (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            選択中の{outside}
            件は現在の表示範囲外で、一括更新の対象に含めません。
            <Button variant="link" size="sm" onClick={() => setSelectedIds([])}>
              選択解除
            </Button>
          </p>
        ) : null}
        {error ? (
          <DataLoadError
            resourceName="タスク"
            isRetrying={isFetching}
            onRetry={() => void refetch()}
          />
        ) : busy ? (
          <LoadingState message="タスクの表示範囲を確認しています。" />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p
                role="status"
                data-task-counts
                className="text-sm text-muted-foreground"
              >
                {legacy || filtered
                  ? `条件一致 ${total}件 · このページ ${tasks.length}件`
                  : `${query.parent_task_id ? "直属の子" : "最上位"} ${total}件`}
                {!legacy
                  ? ` · ${contextCount ? `文脈 ${contextCount}行 · ` : ""}表示 ${taskRows.length}行`
                  : ""}
                {isFetching ? " · 更新中" : ""}
              </p>
              {!legacy ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-pressed={columns === "details"}
                    onClick={() =>
                      setColumns(columns === "details" ? "summary" : "details")
                    }
                  >
                    {columns === "details"
                      ? "基本の列に戻す"
                      : "詳細の列を表示"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-pressed={progress === "shown"}
                    onClick={() =>
                      setProgress(progress === "shown" ? "hidden" : "shown")
                    }
                  >
                    進捗列
                  </Button>
                </div>
              ) : null}
            </div>
            {tree.parentLoading ? (
              <p role="status" className="text-sm text-muted-foreground">
                親の文脈を読み込んでいます…
              </p>
            ) : null}
            {!legacy && tree.parentErrors.length ? (
              <DataLoadError
                resourceName="親の文脈"
                onRetry={tree.retryParents}
              />
            ) : null}
            <p className="text-xs text-muted-foreground xl:hidden">
              横にスクロールすると、状態・担当・期限を確認できます。
            </p>
            {legacy ? (
              <TasksTable
                projectId={projectId}
                tasks={tasks}
                isLoading={false}
                canCreate={canCreate}
                canUpdate={canUpdate}
                selectedTaskIds={selectedIds}
                onToggleTask={check}
                onToggleAllTasks={checkAll}
                onBrowseChildren={onBrowseChildren}
              />
            ) : (
              <TaskTreeTable
                projectId={projectId}
                rows={tree.rows}
                expanded={tree.expanded}
                contextIds={tree.state.context}
                filtered={filtered}
                canUpdate={canUpdate}
                selectedIds={selectedIds}
                activeId={activeId}
                showDetails={columns === "details"}
                showProgress={progress === "shown"}
                onSelect={selectTask}
                onToggle={tree.toggle}
                onContext={tree.context}
                onMore={tree.more}
                onRetry={tree.retry}
                onCheck={check}
                onCheckAll={checkAll}
              />
            )}
            {!legacy ? (
              <p className="text-xs text-muted-foreground">
                {filtered
                  ? "条件に一致したタスク20件単位。文脈行は一致件数に加算しません。"
                  : "最上位・単独20件単位。展開した子は別に20件ずつ表示します。"}
              </p>
            ) : null}
            <DataPagination
              page={query.page ?? 1}
              pageSize={20}
              total={total}
              currentCount={tasks.length}
              isFetching={isFetching}
              isLoading={false}
              onPageChange={onPageChange}
            />
          </>
        )}
      </div>
      {enabled && !legacy ? (
        <TaskListDetailPanel
          projectId={projectId}
          taskId={error ? null : activeId}
          inView={taskRows.some((row) => row.task.id === activeId)}
          onSelect={selectTask}
          onClose={closePanel}
          onRestoreFocus={restoreFocus}
          onNavigate={openFull}
          canUpdate={canUpdate}
          editor={editor}
        />
      ) : null}
      {enabled ? (
        <TaskListEditDialogs projectId={projectId} editor={editor} />
      ) : null}
    </div>
  );
}

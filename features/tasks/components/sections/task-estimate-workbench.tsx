"use client";

import { Fragment, useRef, useState, type KeyboardEvent } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CornerDownRightIcon,
} from "lucide-react";
import { UserAvatar } from "@/components/shared/display/user-avatar";
import { getGanttTaskTree } from "../../lib/planning-phases";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import type { PhaseRead, TaskRead } from "@/lib/api/generated/model";
import { useListTaskEstimateMethodsProjectsProjectIdTaskEstimateMethodsGet } from "@/lib/api/generated/task-estimates/task-estimates";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import {
  effortMeasures,
  groupEffortTasks,
  isActiveEffort,
  phaseKey,
  sumMeasure,
} from "../../lib/effort-workspace";
import { formatEstimateHours, taskPhaseLabel } from "../../lib/task-effort";
import { estimateMethodLabels } from "../../lib/task-estimate";
import { TaskStatusBadge } from "../shared/task-badges";
import { measureNote, measureValue, PhaseDot } from "./effort-controls";
import {
  EffortInlineCell,
  type EditableEffortField,
} from "./effort-inline-cell";
import { EstimatePanel } from "./task-estimate-panel";
import styles from "./effort-workspace.module.css";

const PAGE = 30;
function navigateCells(event: KeyboardEvent<HTMLTableElement>) {
  if (
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    !(event.target instanceof HTMLButtonElement) ||
    !event.target.hasAttribute("data-cell")
  )
    return;
  const button = event.target,
    row = button.closest("tr");
  if (!row) return;
  const buttons = Array.from(
    row.querySelectorAll<HTMLButtonElement>("button[data-cell]"),
  );
  const rows = Array.from(
    event.currentTarget.querySelectorAll<HTMLTableRowElement>("tr[data-task]"),
  );
  const i = rows.indexOf(row),
    j = buttons.indexOf(button);
  let next: HTMLButtonElement | null | undefined;
  if (event.key === "ArrowRight") next = buttons[j + 1];
  if (event.key === "ArrowLeft") next = buttons[j - 1];
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    const target = rows[i + (event.key === "ArrowDown" ? 1 : -1)];
    next =
      target?.querySelector<HTMLButtonElement>(
        `button[data-cell="${button.dataset.cell}"]`,
      ) ?? target?.querySelector("button");
  }
  if (next) {
    event.preventDefault();
    next.focus();
  }
}

export function mayLeaveEffortEditor() {
  if (document.querySelector('[data-effort-pending="true"]')) return false;
  return (
    !document.querySelector('[data-effort-dirty="true"]') ||
    window.confirm("未保存の入力を破棄して移動しますか？")
  );
}

export function TaskEstimateWorkbench({
  active,
  projectId,
  canUpdate,
  canConfirm,
  phases,
  tasks,
  allTasks,
  currentId,
  onSelect,
}: {
  active: boolean;
  projectId: number;
  canUpdate: boolean;
  canConfirm: boolean;
  phases: PhaseRead[];
  tasks: TaskRead[];
  allTasks: TaskRead[];
  currentId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [requestedPage, setPage] = useState(1);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [editing, setEditing] = useState<{
    task: TaskRead;
    field: EditableEffortField;
  } | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const { usersById, getTaskUserLabel } = useTaskUserMap(projectId);
  const groups = groupEffortTasks(tasks, phaseKey);
  const phaseByKey = new Map(phases.map((p) => [String(p.id), p]));
  const keys = Array.from(
    new Set([...phaseByKey.keys(), "shared", "unclassified", ...groups.keys()]),
  ).filter((key) => groups.has(key));
  const ordered = keys.flatMap((key) => {
    const members = groups.get(key) ?? [];
    const stack = getGanttTaskTree(members).reverse();
    const orderedTasks: TaskRead[] = [];
    while (stack.length) {
      const node = stack.pop()!;
      orderedTasks.push(node.task);
      for (let i = node.children.length - 1; i >= 0; i--)
        stack.push(node.children[i]);
    }
    if (orderedTasks.length !== members.length) {
      const known = new Set(orderedTasks.map((t) => t.id));
      orderedTasks.push(...members.filter((t) => !known.has(t.id)));
    }
    return orderedTasks;
  });
  const page = Math.min(
    requestedPage,
    Math.max(1, Math.ceil(ordered.length / PAGE)),
  );
  const visible = ordered.slice((page - 1) * PAGE, page * PAGE);
  const pageGroups = groupEffortTasks(visible, phaseKey);
  const ids = visible.map((t) => t.id);
  const methods =
    useListTaskEstimateMethodsProjectsProjectIdTaskEstimateMethodsGet(
      projectId,
      { task_ids: ids },
      { query: { enabled: active && ids.length > 0, retry: false } },
    );
  const methodById = new Map(
    methods.data?.map((item) => [item.task_id, item.method]),
  );
  const current = allTasks.find((t) => t.id === currentId);
  const table = useRef<HTMLTableElement>(null);
  const restore = () =>
    requestAnimationFrame(() =>
      (trigger.current?.isConnected
        ? trigger.current
        : table.current?.parentElement
      )?.focus({ preventScroll: true }),
    );
  const editCell = (
    task: TaskRead,
    field: EditableEffortField,
    label: string,
  ) => (
    <EffortInlineCell
      task={task}
      field={field}
      phases={phases}
      label={label}
      onClose={() => {
        setEditing(null);
        requestAnimationFrame(() => {
          const row = table.current?.querySelector(
            `tr[data-task="${task.id}"]`,
          );
          const button =
            row?.querySelector<HTMLButtonElement>(
              `button[data-cell="${field}"]`,
            ) ?? row?.querySelector<HTMLButtonElement>("button");
          (button ?? table.current?.parentElement)?.focus({
            preventScroll: true,
          });
        });
      }}
    />
  );
  const select = (task: TaskRead, button: HTMLButtonElement) => {
    if (editing || (current?.id !== task.id && !mayLeaveEffortEditor())) return;
    trigger.current = button;
    onSelect(task.id);
  };
  return (
    <section aria-label="工数見積" className={styles.workspace}>
      {methods.isError && (
        <DataLoadError
          resourceName="見積手法"
          isRetrying={methods.isFetching}
          onRetry={() => void methods.refetch()}
        />
      )}
      <div className={styles.split}>
        <div className={styles.gridArea + " min-w-0"}>
          <div
            className={styles.scroller}
            tabIndex={0}
            role="region"
            aria-label="見積表をスクロール"
          >
            <table
              className={styles.sheet}
              ref={table}
              aria-label="タスクの見積一覧"
              onKeyDown={navigateCells}
            >
              <thead>
                <tr>
                  <th scope="col" className={styles.rowTitle}>
                    タスク
                  </th>
                  <th scope="col">工程</th>
                  <th scope="col">担当</th>
                  <th scope="col">見積手法</th>
                  {effortMeasures.map((m) => (
                    <th scope="col" key={m.key} data-number>
                      {m.label}
                    </th>
                  ))}
                  <th scope="col">状態</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(pageGroups, ([key, items]) => {
                  const all = groups.get(key)!;
                  const closed = collapsed.includes(key);
                  return (
                    <Fragment key={key}>
                      <tr className={styles.group}>
                        <th scope="row">
                          <button
                            className={styles.groupButton}
                            aria-expanded={!closed}
                            disabled={Boolean(editing)}
                            onClick={() =>
                              setCollapsed(
                                closed
                                  ? collapsed.filter((k) => k !== key)
                                  : [...collapsed, key],
                              )
                            }
                          >
                            {closed ? (
                              <ChevronRightIcon size={14} />
                            ) : (
                              <ChevronDownIcon size={14} />
                            )}
                            <PhaseDot phase={phaseByKey.get(key)} />
                            {taskPhaseLabel(items[0])}{" "}
                            <small className="text-muted-foreground">
                              {all.length}件
                            </small>
                          </button>
                        </th>
                        <td
                          colSpan={3}
                          className="text-xs text-muted-foreground"
                        >
                          工程小計
                        </td>
                        {effortMeasures.map((m) => {
                          const t = sumMeasure(all, m.key);
                          return (
                            <td key={m.key} data-number title={measureNote(t)}>
                              {measureValue(t)}
                              {t.entered > 0 &&
                                (t.missing > 0 || t.unreviewed > 0) && (
                                  <small> 小計</small>
                                )}
                            </td>
                          );
                        })}
                        <td />
                      </tr>
                      {!closed &&
                        items.map((task) => {
                          const method = methodById.get(task.id),
                            rollup = task.estimated_basis === "rollup";
                          return (
                            <tr
                              key={task.id}
                              data-task={task.id}
                              data-selected={currentId === task.id}
                            >
                              <th scope="row" className={styles.rowTitle}>
                                <button
                                  data-cell="title"
                                  aria-expanded={currentId === task.id}
                                  title={
                                    task.parent_summary
                                      ? task.parent_summary.title +
                                        " › " +
                                        task.title
                                      : task.title
                                  }
                                  className="flex min-h-8 max-w-full items-center gap-1 text-left"
                                  onClick={(e) => select(task, e.currentTarget)}
                                >
                                  {task.parent_task_id && (
                                    <CornerDownRightIcon
                                      aria-label="子タスク"
                                      size={13}
                                      className="shrink-0 text-muted-foreground"
                                    />
                                  )}
                                  <span className="truncate">{task.title}</span>
                                </button>
                              </th>
                              {(["phase", "assignee_id"] as const).map(
                                (field) => {
                                  const phaseField = field === "phase",
                                    label = phaseField ? "工程" : "担当者";
                                  const content = phaseField ? (
                                    <>
                                      <PhaseDot phase={phaseByKey.get(key)} />
                                      {taskPhaseLabel(task)}
                                    </>
                                  ) : task.assignee_id == null ? (
                                    "担当なし"
                                  ) : (
                                    <>
                                      <UserAvatar
                                        size="sm"
                                        name={getTaskUserLabel(
                                          task.assignee_id,
                                        )}
                                        src={
                                          usersById.get(task.assignee_id)
                                            ?.avatar_url
                                        }
                                      />
                                      {getTaskUserLabel(task.assignee_id)}
                                    </>
                                  );
                                  return (
                                    <td key={field}>
                                      {editing?.task.id === task.id &&
                                      editing.field === field ? (
                                        editCell(editing.task, field, label)
                                      ) : canUpdate ? (
                                        <button
                                          data-cell={field}
                                          aria-label={
                                            task.title + "の" + label + "を編集"
                                          }
                                          className="inline-flex min-h-7 items-center gap-1 rounded px-1 hover:bg-accent"
                                          disabled={Boolean(editing)}
                                          onClick={() =>
                                            setEditing({ task, field })
                                          }
                                        >
                                          {content}
                                        </button>
                                      ) : (
                                        <span className="inline-flex items-center gap-1">
                                          {content}
                                        </span>
                                      )}
                                    </td>
                                  );
                                },
                              )}
                              <td>
                                <button
                                  data-cell="method"
                                  className="rounded border bg-muted/40 px-1.5 py-0.5 text-xs"
                                  onClick={(e) => select(task, e.currentTarget)}
                                >
                                  {rollup
                                    ? "子の集計"
                                    : method
                                      ? estimateMethodLabels[method]
                                      : methods.isSuccess
                                        ? "未設定"
                                        : "—"}
                                </button>
                              </td>
                              {effortMeasures.map((m) => {
                                const field = `${m.key}_minutes` as const;
                                const value = task[field],
                                  excluded =
                                    m.key === "remaining" &&
                                    !isActiveEffort(task);
                                const editable =
                                  canUpdate &&
                                  !excluded &&
                                  (field === "planned_minutes" ||
                                    field === "remaining_minutes" ||
                                    (field === "estimated_minutes" &&
                                      task.estimated_basis === "own" &&
                                      methodById.has(task.id) &&
                                      (!method || method === "simple")));
                                return (
                                  <td key={field} data-number>
                                    {editing?.task.id === task.id &&
                                    editing.field === field ? (
                                      editCell(
                                        editing.task,
                                        editing.field,
                                        m.label,
                                      )
                                    ) : editable ? (
                                      <button
                                        data-cell={field}
                                        className={styles.cell}
                                        disabled={Boolean(editing)}
                                        aria-label={`${task.title}の${m.label}を編集`}
                                        onClick={() => {
                                          setEditing({
                                            task,
                                            field: field as EditableEffortField,
                                          });
                                        }}
                                      >
                                        {formatEstimateHours(value)}
                                      </button>
                                    ) : (
                                      <span
                                        title={
                                          rollup && m.key === "estimated"
                                            ? "子の集計は詳細に表示"
                                            : undefined
                                        }
                                      >
                                        {excluded ||
                                        (rollup && m.key === "estimated")
                                          ? "—"
                                          : formatEstimateHours(value)}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              <td>
                                <TaskStatusBadge status={task.status} />
                              </td>
                            </tr>
                          );
                        })}
                    </Fragment>
                  );
                })}
                {!tasks.length && (
                  <tr>
                    <td colSpan={9}>条件に一致するタスクはありません。</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-between gap-2 px-1 py-2 text-xs text-muted-foreground">
            <span>{tasks.length}件 · — 未入力／対象外</span>
            <span>
              矢印キーでセル移動　Enter で開く・保存　Esc でセル編集を取消
            </span>
          </div>
          {ordered.length > PAGE && (
            <DataPagination
              page={page}
              pageSize={PAGE}
              total={ordered.length}
              currentCount={visible.length}
              onPageChange={(p) => {
                if (!editing) setPage(p);
              }}
            />
          )}
        </div>
        {current && (
          <EstimatePanel
            active={active}
            key={current.id}
            projectId={projectId}
            task={current}
            canUpdate={canUpdate}
            canConfirm={canConfirm}
            onClose={() => {
              if (mayLeaveEffortEditor()) {
                onSelect(null);
                restore();
              }
            }}
          />
        )}
      </div>
    </section>
  );
}

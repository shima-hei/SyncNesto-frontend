"use client";

import { Fragment, useRef, useState, type KeyboardEvent } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CornerDownRightIcon,
} from "lucide-react";
import { TaskPhaseCell } from "../shared/task-phase-cell";
import { PlanningAssigneeCell } from "../shared/planning-assignee-cell";
import type { TaskPlanningController } from "../../hooks/use-task-planning";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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
import { EffortInlineCell, type EditableMinutes } from "./effort-inline-cell";
import { EstimatePanel } from "./task-estimate-panel";
import styles from "./effort-workspace.module.css";

const PAGE = 30;
function navigateCells(event: KeyboardEvent<HTMLTableElement>) {
  if (
    event.defaultPrevented ||
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
  planning,
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
  planning: TaskPlanningController;
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
    field: EditableMinutes;
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
  const [methodChoice, setMethodChoice] = useState<{
    taskId: number;
    method: keyof typeof estimateMethodLabels;
    serial: number;
  }>();
  const requestedCell = useRef<{ id: number; field: EditableMinutes } | null>(
    null,
  );
  const nextCell = useRef<{ id: number; field: string } | null>(null);
  const editCell = (task: TaskRead, field: EditableMinutes, label: string) => (
    <EffortInlineCell
      key={task.id + field}
      task={task}
      field={field}
      label={label}
      onTab={(backwards) => {
        const cells = Array.from(
          table.current?.querySelectorAll<HTMLElement>(
            "[data-cell]:not([data-cell=title]), input[data-effort-dirty]",
          ) ?? [],
        );
        const index = cells.indexOf(document.activeElement as HTMLElement);
        const next = cells[index + (backwards ? -1 : 1)];
        if (!next?.dataset.cell) return false;
        nextCell.current = {
          id: Number(next.closest("tr")?.dataset.task),
          field: next.dataset.cell,
        };
        return true;
      }}
      onClose={(exit) => {
        const destination =
          exit === "next" || exit === "previous" ? nextCell.current : null;
        nextCell.current = null;
        const requested = requestedCell.current;
        requestedCell.current = null;
        setEditing(null);
        if (exit === "blur") {
          if (requested)
            requestAnimationFrame(() =>
              table.current
                ?.querySelector<HTMLButtonElement>(
                  `tr[data-task="${requested.id}"] [data-cell="${requested.field}"]`,
                )
                ?.click(),
            );
          return;
        }
        requestAnimationFrame(() => {
          const target = table.current?.querySelector<HTMLButtonElement>(
            `tr[data-task="${destination?.id ?? task.id}"] [data-cell="${destination?.field ?? field}"]`,
          );
          const fallback = table.current?.querySelector<HTMLButtonElement>(
            `tr[data-task] [data-cell="${field}"]`,
          );
          (target ?? fallback ?? table.current?.parentElement)?.focus();
          if (
            destination &&
            destination.field.endsWith("_minutes") &&
            !target?.disabled
          )
            target?.click();
        });
      }}
    />
  );
  const select = (
    task: TaskRead,
    button: HTMLButtonElement,
    method?: keyof typeof estimateMethodLabels,
  ) => {
    if (!mayLeaveEffortEditor()) return;
    trigger.current = button;
    if (
      task.estimated_basis === "own" &&
      method === "simple" &&
      (!methodById.get(task.id) || methodById.get(task.id) === "simple")
    ) {
      onSelect(null);
      setEditing({ task, field: "estimated_minutes" });
      return;
    }
    if (method)
      setMethodChoice((old) => ({
        taskId: task.id,
        method,
        serial: (old?.serial ?? 0) + 1,
      }));
    else setMethodChoice(undefined);
    onSelect(task.id);
  };
  return (
    <section aria-label="工数見積" className={styles.workspace}>
      {canUpdate && (
        <p className="mb-2 text-xs text-muted-foreground">
          単純見積は見積工数のセルに入力できます。計算式は見積手法から、履歴と計画への反映はタスク名から開きます。
        </p>
      )}
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
              className={styles.sheet + " " + styles.estimateSheet}
              ref={table}
              aria-label="タスクの見積一覧"
              onKeyDown={navigateCells}
            >
              <colgroup>
                <col className={styles.titleColumn} />
                <col className={styles.phaseColumn} />
                <col className={styles.assigneeColumn} />
                <col className={styles.methodColumn} />
                {effortMeasures.map(({ key }) => (
                  <col key={key} className={styles.hoursColumn} />
                ))}
                <col className={styles.statusColumn} />
              </colgroup>
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
                            <span className="truncate">
                              {taskPhaseLabel(items[0])}
                            </span>{" "}
                            <small className="shrink-0 text-muted-foreground">
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
                          const assigneeId = Number(
                            planning.rows[task.id]?.values.assigneeId ??
                              task.assignee_id,
                          );
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
                              <td>
                                <TaskPhaseCell
                                  task={task}
                                  phases={phases}
                                  editable={canUpdate && !planning.pendingDraft}
                                />
                              </td>
                              <td>
                                <PlanningAssigneeCell
                                  task={task}
                                  planning={planning}
                                  editable={canUpdate}
                                  name={getTaskUserLabel(assigneeId)}
                                  avatarUrl={
                                    assigneeId
                                      ? usersById.get(assigneeId)?.avatar_url
                                      : undefined
                                  }
                                />
                              </td>
                              <td>
                                {canUpdate &&
                                !rollup &&
                                methodById.has(task.id) ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        data-cell="method"
                                        aria-label={
                                          task.title + "の見積手法を選択"
                                        }
                                        className="inline-flex max-w-full items-center gap-1 rounded border bg-muted/40 px-1.5 py-1 text-xs"
                                      >
                                        <span className="truncate">
                                          {method
                                            ? estimateMethodLabels[method]
                                            : "手法を選択"}
                                        </span>
                                        <ChevronDownIcon size={12} />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="start"
                                      onCloseAutoFocus={(e) => {
                                        if (
                                          table.current?.querySelector(
                                            "input[data-effort-dirty]",
                                          ) ||
                                          document.querySelector(
                                            "aside h3:focus",
                                          )
                                        )
                                          e.preventDefault();
                                      }}
                                    >
                                      {(
                                        [
                                          "simple",
                                          "pert",
                                          "parametric",
                                          "analogous",
                                        ] as const
                                      ).map((choice) => (
                                        <DropdownMenuItem
                                          key={choice}
                                          onSelect={() => {
                                            const button =
                                              table.current?.querySelector<HTMLButtonElement>(
                                                `tr[data-task="${task.id}"] [data-cell=method]`,
                                              );
                                            if (button)
                                              select(
                                                task,
                                                button,
                                                choice === "pert" &&
                                                  method === "triangular"
                                                  ? "triangular"
                                                  : choice,
                                              );
                                          }}
                                        >
                                          {choice === "pert"
                                            ? "3点見積"
                                            : estimateMethodLabels[choice]}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <button
                                    data-cell="method"
                                    className="text-xs"
                                    onClick={(e) =>
                                      select(task, e.currentTarget)
                                    }
                                  >
                                    {rollup
                                      ? "子の集計"
                                      : method
                                        ? estimateMethodLabels[method]
                                        : methods.isSuccess
                                          ? "未設定"
                                          : "—"}
                                  </button>
                                )}
                              </td>
                              {effortMeasures.map((m) => {
                                const field = `${m.key}_minutes` as const;
                                const value = task[field],
                                  excluded =
                                    m.key === "remaining" &&
                                    !isActiveEffort(task);
                                const basis =
                                  m.key === "estimated" || m.key === "actual"
                                    ? task[`${m.key}_basis`]
                                    : "own";
                                const displayValue = excluded
                                  ? "対象外"
                                  : basis === "rollup"
                                    ? "子の集計"
                                    : basis !== "own"
                                      ? value == null
                                        ? "未確認"
                                        : formatEstimateHours(value) +
                                          "（未確認）"
                                      : value == null
                                        ? "未入力"
                                        : formatEstimateHours(value);
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
                                        aria-label={`${task.title}の${m.label}を編集`}
                                        onClick={() => {
                                          if (editing) {
                                            requestedCell.current = {
                                              id: task.id,
                                              field: field as EditableMinutes,
                                            };
                                            return;
                                          }
                                          setEditing({
                                            task,
                                            field: field as EditableMinutes,
                                          });
                                        }}
                                      >
                                        {value == null ? (
                                          <span className="text-xs text-muted-foreground">
                                            未入力
                                          </span>
                                        ) : (
                                          formatEstimateHours(value)
                                        )}
                                      </button>
                                    ) : (
                                      <span
                                        title={
                                          rollup && m.key === "estimated"
                                            ? "子の集計は詳細に表示"
                                            : undefined
                                        }
                                      >
                                        {displayValue}
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
            <span>{tasks.length}件</span>
            <span>矢印でセル移動　Enter で確定　Tab で次へ　Esc で取消</span>
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
            key={
              current.id +
              "-" +
              (methodChoice?.taskId === current.id
                ? methodChoice.serial
                : "detail")
            }
            initialMethod={
              methodChoice?.taskId === current.id
                ? methodChoice.method
                : undefined
            }
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

"use client";

import { Fragment, useRef, useState, type ReactNode } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CornerDownRightIcon,
} from "lucide-react";
import { TaskPhaseCell } from "../shared/task-phase-cell";
import { PlanningAssigneeCell } from "../shared/planning-assignee-cell";
import type { TaskPlanningController } from "../../hooks/use-task-planning";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEstimateWorksheet } from "../../hooks/use-estimate-worksheet";
import {
  EstimateStandardControls,
  EstimateTotals,
} from "./estimate-standard-controls";
import {
  sheetLabels,
  draftError,
  type SheetMethod,
} from "../../lib/estimate-worksheet";
import { getGanttTaskTree } from "../../lib/planning-phases";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import type { PhaseRead, TaskRead } from "@/lib/api/generated/model";
import {
  useGetEstimateWorksheetProjectsProjectIdEstimateWorksheetGet,
  useGetEstimateStandardProjectsProjectIdEstimateStandardGet,
} from "@/lib/api/generated/task-estimates/task-estimates";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import {
  effortMeasures,
  groupEffortTasks,
  isActiveEffort,
  phaseKey,
  sumMeasure,
} from "../../lib/effort-workspace";
import { formatEstimateHours, taskPhaseLabel } from "../../lib/task-effort";
import {
  calculateEstimate,
  estimateMethodLabels,
} from "../../lib/task-estimate";
import { TaskStatusBadge } from "../shared/task-badges";
import { measureNote, measureValue, PhaseDot } from "./effort-controls";
import { EffortInlineCell, type EditableMinutes } from "./effort-inline-cell";
import { EstimatePanel } from "./task-estimate-panel";
import styles from "./effort-workspace.module.css";

const PAGE = 30;
export function mayLeaveEffortEditor() {
  if (document.querySelector('[data-effort-pending="true"]')) return false;
  return (
    !document.querySelector('[data-effort-dirty="true"]') ||
    window.confirm("未保存の入力を破棄して移動しますか？")
  );
}

export function TaskEstimateWorkbench({
  active,
  filters,
  view,
  setView,
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
  filters: ReactNode;
  view: SheetMethod | "";
  setView: (method: SheetMethod | "") => void;
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
  const [requestedPage, setPage] = useState<number | null>(null);
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
    requestedPage ??
      Math.max(
        1,
        Math.floor(ordered.findIndex((task) => task.id === currentId) / PAGE) +
          1,
      ),
    Math.max(1, Math.ceil(ordered.length / PAGE)),
  );
  const visible = ordered.slice((page - 1) * PAGE, page * PAGE);
  const pageGroups = groupEffortTasks(visible, phaseKey);
  const ids = visible.map((t) => t.id);
  const worksheet =
    useGetEstimateWorksheetProjectsProjectIdEstimateWorksheetGet(
      projectId,
      { task_ids: ids },
      { query: { enabled: active && !!ids.length, retry: false } },
    );
  const standard = useGetEstimateStandardProjectsProjectIdEstimateStandardGet(
    projectId,
    { query: { enabled: active, retry: false } },
  );

  const table = useRef<HTMLTableElement>(null);
  const sheet = useEstimateWorksheet(
    table,
    projectId,
    view || standard.data?.method || "simple",
    visible.filter((t) => !collapsed.includes(phaseKey(t))),
    worksheet.data ?? [],
    canUpdate && active && !!standard.data && worksheet.isSuccess,
    currentId,
  );
  const method = sheet.method;
  const current = allTasks.find((t) => t.id === currentId);

  const restore = () =>
    requestAnimationFrame(() =>
      (trigger.current?.isConnected
        ? trigger.current
        : table.current?.parentElement
      )?.focus({ preventScroll: true }),
    );
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
  const select = (task: TaskRead, button: HTMLButtonElement) => {
    if (sheet.drafts[task.id] || sheet.pending) return;
    if (
      document.querySelector('aside [data-effort-dirty="true"]') &&
      !mayLeaveEffortEditor()
    )
      return;
    trigger.current = button;
    onSelect(task.id);
  };
  return (
    <section
      aria-label="工数見積"
      className={styles.workspace + " space-y-2"}
      data-effort-dirty={sheet.count > 0}
      data-effort-pending={sheet.pending}
    >
      {standard.isError && (
        <DataLoadError
          resourceName="案件の標準見積方式"
          isRetrying={standard.isFetching}
          onRetry={() => void standard.refetch()}
        />
      )}
      {standard.data && (
        <EstimateStandardControls
          projectId={projectId}
          standard={standard.data}
          mode={method}
          view={view}
          changeView={setView}
          locked={!!sheet.count || sheet.pending}
          canManage={canConfirm}
          allTasks={allTasks}
        />
      )}
      <Dialog
        open={!!sheet.conversion}
        onOpenChange={(open) => {
          if (!open) sheet.cancelConversion();
        }}
      >
        {sheet.conversion && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>表示方式で再見積</DialogTitle>
              <DialogDescription>
                {sheet.conversion.title} の入力方式を変更します。
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border p-3 text-sm">
              <div>
                保存済み　
                {estimateMethodLabels[sheet.conversion.base.current.method!]}　
                {formatEstimateHours(sheet.conversion.base.current.minutes)}
              </div>
              <div>
                再見積　{estimateMethodLabels[sheet.conversion.values.method]}
              </div>
            </div>
            <p className="text-sm">
              {sheet.conversion.values.optimistic
                ? "記録済みの3点を引き継ぎ、選択方式で試算します。"
                : "この方式で使用する値を一覧に入力してください。"}
              「変更を保存」で新しい改訂を追加します。過去の改訂・基準見積・計画は保持されます。
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={sheet.cancelConversion}>
                キャンセル
              </Button>
              <Button onClick={sheet.confirmConversion}>一覧で再入力</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
      <EstimateTotals tasks={tasks} />
      {filters}
      {worksheet.isError && (
        <DataLoadError
          resourceName="見積の入力値"
          isRetrying={worksheet.isFetching}
          onRetry={() => void worksheet.refetch()}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span role="status">
          {sheet.pending
            ? "保存中…"
            : sheet.feedback ||
              (sheet.count
                ? sheet.count + "件の変更を編集中"
                : "保存済みの見積を表示")}
        </span>
        {canUpdate && (
          <div className="flex flex-wrap gap-1">
            {sheet.canFill && (
              <Button
                size="sm"
                variant="outline"
                onClick={sheet.fillDown}
                disabled={sheet.pending}
              >
                先頭行を範囲に適用
              </Button>
            )}
            {!!sheet.count && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void sheet.discard()}
                disabled={sheet.pending}
              >
                変更を破棄
              </Button>
            )}
            <Button
              size="sm"
              disabled={!sheet.count || sheet.pending}
              onClick={() => void sheet.save()}
            >
              変更を保存{sheet.count ? " (" + sheet.count + ")" : ""}
            </Button>
          </div>
        )}
      </div>
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
              onKeyDown={(event) => {
                if (
                  event.defaultPrevented ||
                  event.shiftKey ||
                  event.ctrlKey ||
                  event.altKey ||
                  event.metaKey ||
                  !event.key.startsWith("Arrow")
                )
                  return;
                const target = event.target;
                if (
                  !(target instanceof HTMLElement) ||
                  !target.matches(
                    "button[data-cell],input[data-sheet-id][readonly]",
                  )
                )
                  return;
                const row = target.closest("tr[data-task]");
                if (!row) return;
                const selector =
                  "button[data-cell]:not(:disabled), input[data-sheet-id]:not(:disabled)";
                const cells = Array.from(
                  row.querySelectorAll<HTMLElement>(selector),
                );
                const index = cells.indexOf(target);
                let next: HTMLElement | undefined;
                if (event.key === "ArrowLeft" || event.key === "ArrowRight")
                  next = cells[index + (event.key === "ArrowLeft" ? -1 : 1)];
                else {
                  const rows = Array.from(
                    event.currentTarget.querySelectorAll("tr[data-task]"),
                  );
                  const step = event.key === "ArrowUp" ? -1 : 1;
                  for (
                    let i = rows.indexOf(row) + step;
                    rows[i] && !next;
                    i += step
                  ) {
                    next = Array.from(
                      rows[i].querySelectorAll<HTMLElement>(selector),
                    ).find(
                      (el) =>
                        el.dataset.cell === target.dataset.cell &&
                        el.dataset.field === target.dataset.field,
                    );
                  }
                }
                if (next) {
                  event.preventDefault();
                  next.focus();
                }
              }}
              data-method={method}
            >
              <colgroup>
                <col className={styles.titleColumn} />
                <col className={styles.phaseColumn} />
                <col className={styles.assigneeColumn} />
                {method !== "simple" &&
                  sheet.fields.map((field) => (
                    <col
                      key={field}
                      style={{
                        width: field === "referenceWork" ? "10rem" : "5.6rem",
                      }}
                    />
                  ))}
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
                  {method !== "simple" &&
                    sheet.fields.map((field) => (
                      <th
                        scope="col"
                        key={field}
                        data-number
                        className={styles.entryHead}
                      >
                        {sheetLabels[field]}
                      </th>
                    ))}
                  {effortMeasures.map((m) => (
                    <th scope="col" key={m.key} data-number>
                      {m.key === "estimated" && method !== "simple"
                        ? "算出見積"
                        : m.label}
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
                          colSpan={
                            2 + (method === "simple" ? 0 : sheet.fields.length)
                          }
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
                          const base = sheet.byId.get(task.id),
                            draft = sheet.drafts[task.id];
                          const rollup = task.estimated_basis === "rollup";
                          const mismatch =
                            task.estimated_basis === "own" &&
                            !!base?.current.method &&
                            base.current.method !== method &&
                            !draft;
                          const ready = !!base && !!standard.data;
                          const error = draft ? draftError(draft.values) : null;
                          const trial =
                            draft && !error
                              ? calculateEstimate(draft.values).minutes
                              : null;
                          const entries =
                            ready &&
                            task.estimated_basis === "own" &&
                            !mismatch;
                          const exception = base?.current.method && (
                            <span className="flex items-center justify-end gap-1 text-xs">
                              <button
                                type="button"
                                className="truncate underline"
                                title="この方式の入力列を表示"
                                disabled={!!sheet.count}
                                onClick={() => setView(base.current.method!)}
                              >
                                {estimateMethodLabels[base.current.method]}
                              </button>
                              {canUpdate && (
                                <button
                                  type="button"
                                  className="shrink-0 underline"
                                  aria-label={task.title + "を表示方式で再見積"}
                                  onClick={() => sheet.convert(task)}
                                >
                                  再見積
                                </button>
                              )}
                            </span>
                          );
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
                                  disabled={!!draft || sheet.pending}
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
                              {method !== "simple" &&
                                (entries ? (
                                  sheet.fields.map((field) => (
                                    <td
                                      key={field}
                                      className={styles.entryCell}
                                      data-number
                                    >
                                      {sheet.input(task, field)}
                                    </td>
                                  ))
                                ) : (
                                  <td
                                    colSpan={sheet.fields.length}
                                    className="text-right text-xs text-muted-foreground"
                                  >
                                    {mismatch
                                      ? exception
                                      : rollup
                                        ? "子の集計"
                                        : ready
                                          ? "未確認"
                                          : "—"}
                                  </td>
                                ))}
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
                                if (m.key === "estimated") {
                                  if (method === "simple" && entries)
                                    return (
                                      <td
                                        key={field}
                                        data-number
                                        className={styles.entryCell}
                                      >
                                        {sheet.input(task, "hours")}
                                      </td>
                                    );
                                  return (
                                    <td
                                      key={field}
                                      data-number
                                      className={styles.resultCell}
                                      title={error ?? undefined}
                                    >
                                      {draft ? (
                                        error ? (
                                          <span
                                            className="text-xs"
                                            aria-label={error}
                                          >
                                            入力を確認
                                          </span>
                                        ) : (
                                          formatEstimateHours(trial)
                                        )
                                      ) : (
                                        displayValue
                                      )}
                                      {method === "simple" &&
                                        mismatch &&
                                        exception}
                                    </td>
                                  );
                                }
                                const editable =
                                  canUpdate &&
                                  !excluded &&
                                  !draft &&
                                  !sheet.pending &&
                                  (field === "planned_minutes" ||
                                    field === "remaining_minutes");
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
                                      <span>{displayValue}</span>
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
                    <td
                      colSpan={
                        8 + (method === "simple" ? 0 : sheet.fields.length)
                      }
                    >
                      条件に一致するタスクはありません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-between gap-2 px-1 py-2 text-xs text-muted-foreground">
            <span>{tasks.length}件</span>
            <span>
              Enter 確定・編集 ／ Tab 次の入力 ／ Esc セルを取消 ／
              Shift＋クリック 範囲選択 ／ コピー・貼り付け
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
            canUpdate={canUpdate && !sheet.drafts[current.id]}
            canConfirm={
              canConfirm && !sheet.drafts[current.id] && !sheet.pending
            }
            onClose={() => {
              if (
                !document.querySelector('aside [data-effort-dirty="true"]') ||
                mayLeaveEffortEditor()
              ) {
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

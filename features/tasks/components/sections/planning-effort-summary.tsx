import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ChartNoAxesCombinedIcon,
  Clock3Icon,
  LayersIcon,
  TimerResetIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  effortMeasures,
  groupEffortTasks,
  hasEffortIssue,
  phaseKey,
  sumMeasure,
  type EffortFilter,
} from "../../lib/effort-workspace";
import { taskPhaseLabel, formatEstimateHours } from "../../lib/task-effort";
import { getTaskStatusLabel } from "../../constants/task-options";
import type { PhaseRead, TaskRead } from "@/lib/api/generated/model";
import { measureNote, measureValue, PhaseDot } from "./effort-controls";
import { TaskStatusBadge } from "../shared/task-badges";
import styles from "./effort-workspace.module.css";

function effortDifference(items: TaskRead[]) {
  const actual = sumMeasure(items, "actual"),
    planned = sumMeasure(items, "planned");
  if (
    !actual.entered ||
    !planned.entered ||
    actual.missing ||
    actual.unreviewed ||
    planned.missing
  )
    return "—";
  const diff = actual.minutes - planned.minutes;
  return (diff > 0 ? "+" : "") + formatEstimateHours(diff);
}
const icons = {
  estimated: LayersIcon,
  planned: CalendarDaysIcon,
  actual: Clock3Icon,
  remaining: TimerResetIcon,
};
export function PlanningEffortSummary({
  tasks,
  phases,
  filter,
  userLabel,
  onDrill,
  onGantt,
}: {
  tasks: TaskRead[];
  phases: PhaseRead[];
  filter: EffortFilter;
  userLabel: (id: number) => string;
  onDrill: (filter: Partial<EffortFilter>) => void;
  onGantt: (id: number) => void;
}) {
  const scopedReserves = phases.filter((phase) =>
    filter.phase ? String(phase.id) === filter.phase : !phase.archived_at,
  );
  const enteredReserves = scopedReserves.filter(
    (phase) => phase.reserve_minutes != null,
  );
  const showReserves =
    enteredReserves.length > 0 &&
    !(
      filter.search.trim() ||
      filter.assignee ||
      filter.from ||
      filter.to ||
      filter.issue
    );
  const totals = effortMeasures.map((m) => ({
    ...m,
    total: sumMeasure(tasks, m.key),
  }));
  const needs = tasks.filter((t) => hasEffortIssue(t, "missing")).length,
    over = tasks.filter((t) => hasEffortIssue(t, "over")).length;
  const hasData = totals.some((m) => m.total.entered);
  const phaseGroups = groupEffortTasks(tasks, phaseKey);
  const byPerson = Array.from(
    groupEffortTasks(tasks, (t) => String(t.assignee_id ?? "none")),
    ([key, items]) => ({
      key,
      items,
      planned: sumMeasure(items, "planned"),
      remaining: sumMeasure(items, "remaining"),
    }),
  ).sort((a, b) => b.planned.minutes - a.planned.minutes);
  const byPhase = Array.from(phaseGroups, ([key, items]) => ({
    key,
    label: taskPhaseLabel(items[0]),
    items,
    metrics: effortMeasures.map((m) => ({
      ...m,
      total: sumMeasure(items, m.key),
    })),
  }));
  const phaseRank = new Map(phases.map((p, i) => [String(p.id), i]));
  byPhase.sort(
    (a, b) =>
      (phaseRank.get(a.key) ?? phases.length) -
      (phaseRank.get(b.key) ?? phases.length),
  );
  const scale = Math.max(
    1,
    ...byPhase.flatMap((g) =>
      g.metrics.slice(0, 3).map((m) => m.total.minutes),
    ),
  );
  const largestPlan = Math.max(
    1,
    ...byPerson.map((person) => person.planned.minutes),
  );
  const linkClass =
    "inline-flex min-h-7 items-center gap-1 text-left font-medium hover:underline";
  return (
    <section aria-label="工数分析" className="flex min-w-0 flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {totals.map(({ key, label, tone, total }) => {
          const Icon = icons[key];
          return (
            <div
              key={key}
              className="min-w-0 rounded-lg border bg-card px-3 py-2.5"
              style={{ borderTopColor: `var(--status-${tone}-chart)` }}
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon size={15} style={{ color: `var(--status-${tone}-fg)` }} />
                {label}
              </div>
              <p className="pt-1 text-xl font-semibold tabular-nums">
                {measureValue(total)}
              </p>
              <p className="text-xs text-muted-foreground">
                {total.entered && measureNote(total) ? "入力済み小計 · " : ""}
                {measureNote(total) ||
                  (total.entered ? `入力済み ${total.entered}件` : "対象なし")}
              </p>
            </div>
          );
        })}
        {(
          [
            {
              key: "missing",
              label: "見積未入力",
              count: needs,
              tone: "warning",
            },
            {
              key: "over",
              label: "実績が計画超過",
              count: over,
              tone: "danger",
            },
          ] as const
        ).map((x) => (
          <button
            key={x.key}
            type="button"
            disabled={!x.count}
            onClick={() => onDrill({ issue: x.key })}
            className="min-w-0 rounded-lg border px-3 py-2.5 text-left enabled:cursor-pointer enabled:hover:brightness-110"
            style={{
              background: `var(--status-${x.tone}-bg)`,
              color: `var(--status-${x.tone}-fg)`,
              borderColor: `var(--status-${x.tone}-border)`,
            }}
          >
            <span className="flex items-center gap-1.5 text-xs">
              <TriangleAlertIcon size={15} />
              {x.label}
            </span>
            <strong className="block pt-1 text-xl tabular-nums">
              {x.count} <small className="text-xs">件</small>
            </strong>
            {x.count > 0 && (
              <span className="flex items-center gap-1 text-xs">
                対象を確認 <ArrowRightIcon size={12} />
              </span>
            )}
          </button>
        ))}
      </div>
      {showReserves && (
        <details className="rounded-md border bg-card px-3 py-2 text-sm">
          <summary className="cursor-pointer">
            工程予備工数（別枠）　
            <strong className="tabular-nums">
              {formatEstimateHours(
                enteredReserves.reduce(
                  (sum, phase) => sum + (phase.reserve_minutes ?? 0),
                  0,
                ),
              )}
            </strong>
            <span className="ml-2 text-xs text-muted-foreground">
              登録 {enteredReserves.length} / {scopedReserves.length} 工程
            </span>
          </summary>
          <dl className="mt-2 divide-y" aria-label="工程予備工数の内訳">
            {scopedReserves.map((phase) => (
              <div key={phase.id} className="flex justify-between gap-2 py-1">
                <dt className="flex min-w-0 items-center gap-1.5 wrap-anywhere">
                  <PhaseDot phase={phase} />
                  {phase.name}
                </dt>
                <dd className="shrink-0 tabular-nums">
                  {phase.reserve_minutes == null
                    ? "未入力"
                    : formatEstimateHours(phase.reserve_minutes)}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      {!hasData ? (
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">
            {tasks.length
              ? "集計できる工数がまだありません"
              : "条件に一致するタスクはありません"}
          </h3>
          {tasks.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => onDrill(needs ? { issue: "missing" } : {})}
            >
              見積表を開く <ArrowRightIcon />
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid min-w-0 items-start gap-3 xl:grid-cols-[1.2fr_1fr]">
            <section
              className="rounded-lg border bg-card p-3"
              aria-label="工程別の工数比較"
            >
              <h3 className="flex items-center gap-2 font-semibold">
                <ChartNoAxesCombinedIcon size={17} />
                工程別の工数比較
              </h3>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {effortMeasures.slice(0, 3).map((m) => (
                  <span key={m.key} className="flex items-center gap-1">
                    <i
                      className="size-2 rounded-sm"
                      style={{ background: `var(--status-${m.tone}-chart)` }}
                    />
                    {m.label}
                  </span>
                ))}
              </div>
              <ul className="mt-2 divide-y">
                {byPhase.map((g) => (
                  <li
                    key={g.key}
                    className="grid grid-cols-[minmax(5rem,1fr)_minmax(8rem,2fr)] items-center gap-3 py-2"
                  >
                    <button
                      className={linkClass}
                      onClick={() => onDrill({ phase: g.key })}
                    >
                      <PhaseDot
                        phase={phases.find((p) => String(p.id) === g.key)}
                      />
                      <span className="wrap-anywhere">{g.label}</span>
                    </button>
                    <div className="grid gap-0.5">
                      {g.metrics.slice(0, 3).map((m) => (
                        <div
                          key={m.key}
                          className="flex items-center gap-2 text-xs"
                          title={[m.label, measureNote(m.total)]
                            .filter(Boolean)
                            .join(" · ")}
                        >
                          <div className="h-1.5 flex-1 rounded-sm bg-muted">
                            <div
                              className="h-full rounded-sm"
                              style={{
                                width: `${(m.total.minutes / scale) * 100}%`,
                                background: `var(--status-${m.tone}-chart)`,
                              }}
                            />
                          </div>
                          <span className="min-w-16 text-right tabular-nums">
                            <span className="sr-only">{m.label} </span>
                            {measureValue(m.total)}
                            {m.total.entered > 0 && measureNote(m.total)
                              ? " 小計"
                              : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <section
              aria-label="担当者別の登録工数"
              className="rounded-lg border bg-card p-3"
            >
              <h3 className="font-semibold">担当者別の登録工数</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                案件内の計画工数と、完了・中止を除く残工数
              </p>
              <ul className="mt-2 divide-y">
                {byPerson.map((p) => (
                  <li className="py-2" key={p.key}>
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <button
                        className={linkClass}
                        onClick={() => onDrill({ assignee: p.key })}
                      >
                        {p.key === "none"
                          ? "担当なし"
                          : userLabel(Number(p.key))}
                        <ArrowRightIcon size={12} />
                      </button>
                      <span className="text-xs tabular-nums">
                        計画 {measureValue(p.planned)}
                        {p.planned.entered > 0 && p.planned.missing
                          ? " 小計"
                          : ""}{" "}
                        ／ 残 {measureValue(p.remaining)}
                        {p.remaining.entered > 0 && p.remaining.missing
                          ? " 小計"
                          : ""}
                      </span>
                    </div>
                    <div className="my-1 h-1.5 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[var(--status-resolved-chart)]"
                        style={{
                          width: `${(p.planned.minutes / largestPlan) * 100}%`,
                        }}
                      />
                    </div>
                    <details className="my-1 text-xs text-muted-foreground">
                      <summary className="cursor-pointer">工数の内訳</summary>
                      <dl className="grid grid-cols-2 gap-1 py-1">
                        {effortMeasures.map((m) => {
                          const t = sumMeasure(p.items, m.key);
                          return (
                            <div key={m.key}>
                              <dt>{m.label}</dt>
                              <dd>
                                {measureValue(t)} {measureNote(t)}
                              </dd>
                            </div>
                          );
                        })}
                        <div>
                          <dt>差（実績−計画）</dt>
                          <dd>{effortDifference(p.items)}</dd>
                        </div>
                      </dl>
                    </details>
                    {p.key !== "none" && (
                      <button
                        className="text-xs text-muted-foreground hover:underline"
                        onClick={() => onGantt(Number(p.key))}
                      >
                        ガントで確認
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <h3 className="mb-2 font-semibold">工程サマリー</h3>
            <div
              className={styles.scroller}
              role="region"
              tabIndex={0}
              aria-label="工程サマリーをスクロール"
            >
              <table className={styles.sheet}>
                <thead>
                  <tr>
                    {[
                      "工程",
                      "タスク",
                      ...effortMeasures.map((m) => m.label),
                      "差（実績−計画）",
                      "完了 / 全件",
                    ].map((h) => (
                      <th key={h} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byPhase.map((g) => (
                    <tr key={g.key}>
                      <th scope="row">
                        <button
                          className={linkClass}
                          onClick={() => onDrill({ phase: g.key })}
                        >
                          {g.label}
                        </button>
                      </th>
                      <td>{g.items.length}</td>
                      {g.metrics.map((m) => (
                        <td key={m.key}>
                          {measureValue(m.total)}
                          {measureNote(m.total) && (
                            <small className="block text-muted-foreground">
                              {measureNote(m.total)}
                            </small>
                          )}
                        </td>
                      ))}
                      <td>{effortDifference(g.items)}</td>
                      <td>
                        {g.items.filter((t) => t.status === "done").length} /{" "}
                        {g.items.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <details className="rounded-md border p-2">
            <summary className="cursor-pointer text-sm font-medium">
              状態別の内訳
            </summary>
            <div
              className={styles.scroller}
              role="region"
              aria-label="状態別の内訳表"
              tabIndex={0}
            >
              <table className={styles.sheet}>
                <thead>
                  <tr>
                    {[
                      "状態",
                      "タスク",
                      ...effortMeasures.map((m) => m.label),
                    ].map((h) => (
                      <th key={h} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(
                    groupEffortTasks(tasks, (t) => t.status ?? ""),
                    ([s, items]) => (
                      <tr key={s}>
                        <th scope="row" aria-label={getTaskStatusLabel(s)}>
                          <TaskStatusBadge status={s} />
                        </th>
                        <td>{items.length}</td>
                        {effortMeasures.map((m) => {
                          const x = sumMeasure(items, m.key);
                          return (
                            <td key={m.key}>
                              {measureValue(x)}
                              <small className="block text-muted-foreground">
                                {measureNote(x)}
                              </small>
                            </td>
                          );
                        })}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}

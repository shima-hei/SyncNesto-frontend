import { CalendarDaysIcon, ListFilterIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PhaseRead, TaskRead } from "@/lib/api/generated/model";
import {
  initialEffortFilter,
  type EffortFilter,
  type MeasureTotal,
} from "../../lib/effort-workspace";
import { formatEstimateHours } from "../../lib/task-effort";
import { phaseColors } from "../../lib/phase-colors";

export const selectStyle =
  "h-8 min-w-0 max-w-full rounded-md border bg-background px-2 text-sm";
export function PhaseDot({ phase }: { phase?: PhaseRead }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-2.5 shrink-0 rounded-[3px] ${phase?.color ? phaseColors[phase.color].className : "bg-muted-foreground/65"}`}
    />
  );
}
export function measureValue(total: MeasureTotal) {
  return total.entered
    ? formatEstimateHours(total.minutes)
    : total.missing
      ? "未入力"
      : total.unreviewed
        ? "未確認"
        : "—";
}
export function measureNote(total: MeasureTotal) {
  return [
    total.missing ? `未入力 ${total.missing}件` : "",
    total.unreviewed ? `未確認 ${total.unreviewed}件` : "",
  ]
    .filter(Boolean)
    .join("・");
}
export function EffortControls({
  value,
  onChange,
  phases,
  tasks,
  userLabel,
}: {
  value: EffortFilter;
  onChange: (value: EffortFilter) => void;
  phases: PhaseRead[];
  tasks: TaskRead[];
  userLabel: (id?: number | null) => string;
}) {
  const update = (patch: Partial<EffortFilter>) =>
    onChange({ ...value, ...patch });
  const ids = Array.from(
    new Set(
      tasks.flatMap((task) =>
        task.assignee_id == null ? [] : [task.assignee_id],
      ),
    ),
  ).sort((a, b) => userLabel(a).localeCompare(userLabel(b), "ja"));
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/25 p-2">
      <label className="relative min-w-40 max-w-80 flex-1">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground"
        />
        <Input
          type="search"
          className="h-8 pl-8"
          aria-label="タスクを検索"
          placeholder="タスク名・ID・担当者を検索"
          value={value.search}
          onChange={(e) => update({ search: e.target.value })}
        />
      </label>
      <select
        className={selectStyle}
        aria-label="工程で絞り込み"
        value={value.phase}
        onChange={(e) => update({ phase: e.target.value })}
      >
        <option value="">全工程</option>
        {phases.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.archived_at ? "（アーカイブ済み）" : ""}
          </option>
        ))}
        <option value="shared">共通作業</option>
        <option value="unclassified">未分類</option>
      </select>
      <select
        className={selectStyle}
        aria-label="担当者で絞り込み"
        value={value.assignee}
        onChange={(e) => update({ assignee: e.target.value })}
      >
        <option value="">全担当者</option>
        <option value="none">担当なし</option>
        {ids.map((id) => (
          <option key={id} value={id}>
            {userLabel(id)}
          </option>
        ))}
      </select>
      <select
        className={selectStyle}
        aria-label="確認事項"
        value={value.issue}
        onChange={(e) =>
          update({ issue: e.target.value as EffortFilter["issue"] })
        }
      >
        <option value="">すべてのタスク</option>
        <option value="missing">見積未入力</option>
        <option value="over">実績が計画超過</option>
      </select>
      <details className="relative">
        <summary className="flex h-8 cursor-pointer list-none items-center gap-1 rounded-md border bg-background px-2 text-sm">
          <CalendarDaysIcon className="size-4" />{" "}
          {value.from || value.to ? "期間指定中" : "全期間"}
        </summary>
        <div className="absolute right-0 z-20 mt-1 grid w-56 gap-2 rounded-lg border bg-popover p-3 text-sm shadow-lg">
          <label>
            予定期間の開始
            <Input
              type="date"
              aria-label="期間の開始"
              max={value.to || undefined}
              value={value.from}
              onChange={(e) => update({ from: e.target.value })}
            />
          </label>
          <label>
            予定期間の終了
            <Input
              type="date"
              aria-label="期間の終了"
              min={value.from || undefined}
              value={value.to}
              onChange={(e) => update({ to: e.target.value })}
            />
          </label>
          {value.from && value.to && value.from > value.to && (
            <p role="alert">終了は開始以降の日を選んでください。</p>
          )}
        </div>
      </details>
      {Object.values(value).some(Boolean) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(initialEffortFilter)}
        >
          <ListFilterIcon />
          条件を解除
        </Button>
      )}
    </div>
  );
}

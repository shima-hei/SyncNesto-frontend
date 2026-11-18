"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Settings2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type {
  ProjectEstimateStandard,
  TaskRead,
} from "@/lib/api/generated/model";
import {
  getGetEstimateStandardProjectsProjectIdEstimateStandardGetQueryKey,
  updateEstimateStandardProjectsProjectIdEstimateStandardPatch,
} from "@/lib/api/generated/task-estimates/task-estimates";
import { estimateMethodLabels } from "../../lib/task-estimate";
import { sheetFormula, type SheetMethod } from "../../lib/estimate-worksheet";
import { effortMeasures, sumMeasure } from "../../lib/effort-workspace";
import { measureNote, measureValue, selectStyle } from "./effort-controls";
const methods: SheetMethod[] = [
  "simple",
  "pert",
  "triangular",
  "parametric",
  "analogous",
];
function methodOptions() {
  return methods.map((m) => (
    <option value={m} key={m}>
      {estimateMethodLabels[m]}
    </option>
  ));
}
export function EstimateStandardControls({
  projectId,
  standard,
  mode,
  view,
  changeView,
  locked,
  canManage,
  allTasks,
}: {
  projectId: number;
  standard: ProjectEstimateStandard;
  mode: SheetMethod;
  view: SheetMethod | "";
  changeView: (m: SheetMethod | "") => void;
  locked: boolean;
  canManage: boolean;
  allTasks: TaskRead[];
}) {
  const [preview, setPreview] = useState<ProjectEstimateStandard | null>(null),
    [choice, setChoice] = useState<SheetMethod>("simple");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const client = useQueryClient();
  const key =
    getGetEstimateStandardProjectsProjectIdEstimateStandardGetQueryKey(
      projectId,
    );
  async function apply() {
    if (!preview || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result =
        await updateEstimateStandardProjectsProjectIdEstimateStandardPatch(
          projectId,
          { version: preview.version, method: choice },
        );
      client.setQueryData(key, result);
      setPreview(null);
    } catch {
      setError(
        "標準方式を保存できませんでした。閉じて最新の設定を確認してください。",
      );
      await client.invalidateQueries({ queryKey: key });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border bg-card px-3 py-2 text-sm">
      <span>
        <span className="mr-2 text-muted-foreground">案件の標準</span>
        <strong>{estimateMethodLabels[standard.method]}</strong>
      </span>
      {canManage && (
        <Button
          variant="outline"
          size="sm"
          disabled={locked}
          onClick={() => {
            setError("");
            setChoice(standard.method);
            setPreview(standard);
          }}
        >
          <Settings2Icon />
          標準を変更
        </Button>
      )}
      <label className="flex items-center gap-2 text-muted-foreground">
        表示方式
        <select
          aria-label="表示方式"
          className={selectStyle}
          disabled={locked}
          value={view}
          onChange={(e) => changeView(e.target.value as SheetMethod | "")}
        >
          <option value="">標準に合わせる</option>
          {methodOptions()}
        </select>
      </label>
      <span className="text-xs text-muted-foreground">
        {sheetFormula[mode]}
      </span>
      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open && !busy) setPreview(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>案件の標準見積方式を変更</DialogTitle>
            <DialogDescription>
              全員が「標準に合わせる」で開いたときに使用する入力列を設定します。
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-2">
            新しい標準方式
            <select
              aria-label="新しい標準方式"
              className={selectStyle}
              value={choice}
              disabled={busy}
              onChange={(e) => setChoice(e.target.value as SheetMethod)}
            >
              {methodOptions()}
            </select>
          </label>
          <p className="rounded-md border bg-muted/40 p-3 text-sm">
            {estimateMethodLabels[preview?.method ?? standard.method]} →{" "}
            {estimateMethodLabels[choice]}
            <br />
            保存済みの見積{" "}
            {
              allTasks.filter(
                (t) =>
                  t.estimated_basis === "own" && t.estimated_minutes != null,
              ).length
            }{" "}
            件は現在の方式と入力値を保持します。再入力は不要です。改訂履歴・基準見積・計画工数・日程への変更はありません。
          </p>
          {error && <p role="alert">{error}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setPreview(null)}
            >
              キャンセル
            </Button>
            <Button
              disabled={
                busy || !preview || !!error || choice === preview.method
              }
              onClick={() => void apply()}
            >
              {busy ? "保存中…" : "標準方式を保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function EstimateTotals({ tasks }: { tasks: TaskRead[] }) {
  const estimates = sumMeasure(tasks, "estimated");
  return (
    <dl
      aria-label="表示対象の保存済み工数"
      className="grid grid-cols-2 divide-x divide-y overflow-hidden rounded-md border bg-card sm:grid-cols-3 xl:grid-cols-6"
    >
      {effortMeasures.map((m) => {
        const total = sumMeasure(tasks, m.key);
        return (
          <div key={m.key} className="px-3 py-2" title={measureNote(total)}>
            <dt className="text-xs text-muted-foreground">{m.label}</dt>
            <dd
              className="text-lg font-semibold tabular-nums"
              style={{ color: "var(--status-" + m.tone + "-chart)" }}
            >
              {measureValue(total)}
              {total.entered > 0 &&
                (total.missing > 0 || total.unreviewed > 0) && (
                  <small className="ml-1 text-xs font-normal text-muted-foreground">
                    小計
                  </small>
                )}
            </dd>
          </div>
        );
      })}
      {[
        ["見積済み", estimates.entered],
        ["未入力", estimates.missing],
      ].map(([label, n]) => (
        <div key={label} className="px-3 py-2">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {n}
            <small className="ml-1 text-xs font-normal">件</small>
          </dd>
        </div>
      ))}
    </dl>
  );
}

import type { EffortMetric, TaskRead } from "@/lib/api/generated/model";

export const formatEffortMetric = (metric?: EffortMetric | null) =>
  metric
    ? `${metric.complete ? "" : "確認済み小計 "}${metric.minutes ?? 0} 分${metric.missing_count ? `・未入力${metric.missing_count}件` : ""}${metric.unreviewed_count ? `・未確認${metric.unreviewed_count}件` : ""}`
    : "未取得";
export const taskPhaseLabel = (task: TaskRead) =>
  task.phase_scope === "phase"
    ? `${task.phase_name ?? `工程 #${task.phase_id}`}${task.phase_archived ? "（アーカイブ済み）" : ""}`
    : task.phase_scope === "shared"
      ? "共通作業"
      : "未分類";
export const effortBasisLabel = (basis?: string) =>
  basis === "rollup"
    ? "子の集計枠"
    : basis === "unreviewed"
      ? "未確認"
      : "自身の作業";

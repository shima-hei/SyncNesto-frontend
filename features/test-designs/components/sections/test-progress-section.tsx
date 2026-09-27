"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { getTaskStatusLabel } from "@/features/tasks/constants/task-options";
import {
  listTestCasesProjectsProjectIdTestDesignsDesignIdCasesGet as listCases,
  readTestDesignProjectsProjectIdTestDesignsDesignIdGet as readDesign,
} from "@/lib/api/generated/test-designs/test-designs";
import { readTestProgressProjectsProjectIdTestDesignsDesignIdProgressGet as readProgress } from "@/lib/api/generated/test-issues/test-issues";
import type { TestCaseRead } from "@/lib/api/generated/model";

type DrillDown = {
  status?: TestCaseRead["status"];
  targetFeature?: string;
  onlyUnlinkedNg?: boolean;
  issueTaskId?: number;
  caseId?: string;
};

const statusItems = [
  { key: "not_run", label: "未実行", color: "bg-slate-400" },
  { key: "in_progress", label: "実施中", color: "bg-sky-500" },
  { key: "passed", label: "成功", color: "bg-emerald-500" },
  { key: "failed", label: "失敗", color: "bg-red-500" },
  { key: "blocked", label: "保留", color: "bg-amber-500" },
  { key: "not_applicable", label: "対象外", color: "bg-zinc-500" },
] as const;

function percent(numerator: number, denominator: number) {
  return denominator ? `${Math.round((numerator / denominator) * 100)}%` : "－";
}

export function TestProgressSection({
  projectId,
  designId,
  onDrillDown,
}: {
  projectId: number;
  designId: number;
  onDrillDown: (target: DrillDown) => void;
}) {
  const [targetFeature, setTargetFeature] = useState("");
  const [listMode, setListMode] = useState<"issues" | "failed">("issues");
  const progress = useQuery({
    queryKey: ["test-progress", projectId, designId, targetFeature],
    queryFn: () =>
      readProgress(
        projectId,
        designId,
        targetFeature ? { target_feature: targetFeature } : undefined,
      ),
  });
  const cases = useQuery({
    queryKey: ["test-design-cases", projectId, designId],
    queryFn: () => listCases(projectId, designId),
  });
  const design = useQuery({
    queryKey: ["test-design-current", projectId, designId],
    queryFn: () => readDesign(projectId, designId),
  });
  const targetByItem = new Map(
    (design.data?.items ?? []).map((item) => [item.id, item.target_feature]),
  );
  const currentTarget = (row: TestCaseRead) =>
    targetByItem.get(
      (row.source as { item?: { id?: string } }).item?.id ?? "",
    ) ?? "";
  const targets = [
    ...new Set(
      (cases.data ?? [])
        .filter((row) => row.active)
        .map(currentTarget)
        .filter(Boolean),
    ),
  ].sort();
  const data = progress.data;
  const failedCases = (cases.data ?? []).filter(
    (row) =>
      row.active &&
      row.status === "failed" &&
      (!targetFeature || currentTarget(row) === targetFeature),
  );
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">集計・進捗</h3>
        <select
          aria-label="対象画面・機能で集計"
          className="rounded border bg-background p-2 text-sm"
          value={targetFeature}
          onChange={(event) => setTargetFeature(event.target.value)}
        >
          <option value="">すべての対象画面・機能</option>
          {targets.map((target) => (
            <option key={target} value={target}>
              {target}
            </option>
          ))}
        </select>
      </div>
      {progress.isLoading && <p>集計中…</p>}
      {progress.error && <p role="alert">集計を読み込めませんでした。</p>}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded border p-4">
              <p className="text-sm text-muted-foreground">全テストケース</p>
              <p className="text-2xl font-semibold">{data.total}</p>
            </div>
            <div className="rounded border p-4">
              <p className="text-sm text-muted-foreground">進捗率</p>
              <p className="text-2xl font-semibold">
                {percent(data.progress_numerator, data.progress_denominator)}
              </p>
              <p className="text-xs text-muted-foreground">
                成功＋失敗 {data.progress_numerator}件 / 対象外を除く{" "}
                {data.progress_denominator}件
              </p>
            </div>
            <div className="rounded border p-4">
              <p className="text-sm text-muted-foreground">NG率</p>
              <p className="text-2xl font-semibold">
                {percent(data.ng_numerator, data.ng_denominator)}
              </p>
              <p className="text-xs text-muted-foreground">
                失敗 {data.ng_numerator}件 / 成功＋失敗 {data.ng_denominator}件
              </p>
            </div>
            <div className="rounded border p-4">
              <p className="text-sm text-muted-foreground">関連Issue</p>
              <p className="text-2xl font-semibold">{data.issue_count}</p>
              <p className="text-xs text-muted-foreground">
                重複を除いた不具合タスク数
              </p>
            </div>
          </div>
          <div className="space-y-3 rounded border p-4">
            <h4 className="font-semibold">最新実行結果の内訳</h4>
            <div
              className="flex h-5 overflow-hidden rounded bg-muted"
              aria-hidden="true"
            >
              {statusItems.map(
                ({ key, color }) =>
                  data[key] > 0 && (
                    <div
                      key={key}
                      className={color}
                      style={{ width: `${(data[key] / data.total) * 100}%` }}
                    />
                  ),
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {statusItems.map(({ key, label, color }) => (
                <button
                  key={key}
                  type="button"
                  className="flex items-center justify-between rounded border p-2 text-left hover:bg-accent"
                  onClick={() => onDrillDown({ status: key, targetFeature })}
                >
                  <span className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${color}`} />
                    {label}
                  </span>
                  <strong>{data[key]}</strong>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              対象外は進捗率の分母から除外し、実施中・保留は完了数に含めません。過去の実行履歴は加算しません。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded border p-3 text-left hover:bg-accent"
              onClick={() => onDrillDown({ status: "failed", targetFeature })}
            >
              NGテストケース <strong>{data.failed}件</strong>
            </button>
            <button
              type="button"
              className="rounded border p-3 text-left hover:bg-accent"
              onClick={() =>
                onDrillDown({ onlyUnlinkedNg: true, targetFeature })
              }
            >
              Issue未登録NG <strong>{data.failed_without_issue}件</strong>
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={listMode === "issues" ? "default" : "outline"}
                onClick={() => setListMode("issues")}
              >
                Issue一覧
              </Button>
              <Button
                size="sm"
                variant={listMode === "failed" ? "default" : "outline"}
                onClick={() => setListMode("failed")}
              >
                NGケース一覧
              </Button>
            </div>
            {listMode === "issues" ? (
              <div className="divide-y rounded border">
                {data.issues.length === 0 && (
                  <p className="p-3 text-sm text-muted-foreground">
                    関連Issueはありません。
                  </p>
                )}
                {data.issues.map((issue) => (
                  <div
                    key={issue.task_id}
                    className="flex flex-wrap items-center justify-between gap-2 p-3"
                  >
                    <Link
                      className="underline"
                      href={`/projects/joined/${projectId}/tasks/${issue.task_id}`}
                    >
                      {issue.task_code} {issue.title} ·{" "}
                      {getTaskStatusLabel(issue.status)}
                    </Link>
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-sm hover:bg-accent"
                      onClick={() =>
                        onDrillDown({
                          issueTaskId: issue.task_id,
                          targetFeature,
                        })
                      }
                    >
                      関連ケース {issue.case_count}件 / 現在NG{" "}
                      {issue.failed_case_count}件
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y rounded border">
                {failedCases.length === 0 && (
                  <p className="p-3 text-sm text-muted-foreground">
                    NGケースはありません。
                  </p>
                )}
                {failedCases.map((testCase) => {
                  const source = testCase.source as {
                    item?: { code?: string; content?: string };
                    pattern?: { code?: string };
                  };
                  return (
                    <button
                      key={testCase.id}
                      type="button"
                      className="block w-full p-3 text-left hover:bg-accent"
                      onClick={() =>
                        onDrillDown({
                          status: "failed",
                          targetFeature,
                          caseId: testCase.id,
                        })
                      }
                    >
                      {source.item?.code} {source.pattern?.code} ·{" "}
                      {source.item?.content}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

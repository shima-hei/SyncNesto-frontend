"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getConflictCurrent } from "@/lib/api/conflict";
import type {
  TaskEstimateRead,
  TaskEstimateRevisionRead,
  TaskEstimateUpdate,
  TaskRead,
} from "@/lib/api/generated/model";
import {
  updateTaskEstimateTasksTaskIdEstimatePatch,
  useGetTaskEstimateTasksTaskIdEstimateGet,
} from "@/lib/api/generated/task-estimates/task-estimates";
import { useReadTaskTasksTaskIdGet } from "@/lib/api/generated/tasks/tasks";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { invalidateTaskProjectSurfaces } from "../../lib/task-cache";
import {
  calculateThreePointMinutes,
  estimateMethodLabels,
  parseEstimateHours,
  toHourInput,
} from "../../lib/task-estimate";
import {
  effortBasisLabel,
  formatEstimateHours,
  formatEffortMetric,
} from "../../lib/task-effort";
import { TaskEstimateBaseline } from "./task-estimate-baseline";
import { TaskEffortPlanEditor } from "./task-effort-plan-editor";

import styles from "./effort-workspace.module.css";
const PAGE_SIZE = 20;

export function EstimatePanel({
  active,
  projectId,
  task,
  canUpdate,
  canConfirm,
  onClose,
}: {
  active: boolean;
  projectId: number;
  task: TaskRead;
  canUpdate: boolean;
  canConfirm: boolean;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const { getTaskUserLabel } = useTaskUserMap(projectId);
  const details = useGetTaskEstimateTasksTaskIdEstimateGet(
    task.id,
    { page },
    { query: { enabled: active, retry: false, staleTime: 0 } },
  );
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "nearest" });
  }, [task.id]);
  const rolled = useReadTaskTasksTaskIdGet(task.id, {
    query: {
      enabled: active && task.estimated_basis === "rollup",
      retry: false,
    },
  });
  const rolledEstimate = rolled.data?.effort_totals?.estimated;
  return (
    <aside
      aria-label={`${task.title}の見積詳細`}
      className={styles.panel + " flex flex-col gap-3"}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{task.task_code}</p>
          <h3
            ref={heading}
            tabIndex={-1}
            className="font-semibold wrap-anywhere"
          >
            {task.title}
          </h3>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          閉じる
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        集計上の見積根拠　{effortBasisLabel(task.estimated_basis)} ·{" "}
        <Link
          className="underline"
          href={`/projects/joined/${projectId}/tasks/${task.id}`}
        >
          タスク詳細
        </Link>
      </p>
      {details.isError && (
        <DataLoadError
          resourceName="見積明細"
          isRetrying={details.isFetching}
          onRetry={() => void details.refetch()}
        />
      )}
      {details.isPending && active && <p role="status">見積明細を取得中…</p>}
      {details.data && (
        <>
          {task.estimated_basis === "rollup" ? (
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs">ボトムアップ · 子孫の見積小計</p>
              <p className="text-lg font-semibold">
                {rolledEstimate
                  ? rolledEstimate.complete || rolledEstimate.minutes
                    ? formatEffortMetric(rolledEstimate, true)
                    : [
                        rolledEstimate.missing_count
                          ? `未入力 ${rolledEstimate.missing_count}件`
                          : "",
                        rolledEstimate.unreviewed_count
                          ? `未確認 ${rolledEstimate.unreviewed_count}件`
                          : "",
                      ]
                        .filter(Boolean)
                        .join("・")
                  : rolled.isError
                    ? "取得に失敗しました"
                    : "取得中…"}
              </p>
              <p className="text-xs text-muted-foreground">
                所属する子タスクで見積を編集します。
              </p>
            </div>
          ) : canUpdate ? (
            <EstimateForm
              projectId={projectId}
              taskId={task.id}
              detail={details.data}
              refresh={async () => (await details.refetch()).data}
            />
          ) : (
            <div>
              <p>
                {details.data.current.method
                  ? estimateMethodLabels[details.data.current.method]
                  : "見積未入力"}
                　{formatEstimateHours(details.data.current.minutes)}
              </p>
              {details.data.current.assumptions && (
                <p className="whitespace-pre-wrap">
                  {details.data.current.assumptions}
                </p>
              )}
            </div>
          )}
          <details className="rounded-md border p-2">
            <summary className="cursor-pointer text-sm font-medium">
              計画工数・残工数と基準見積
            </summary>
            <TaskEffortPlanEditor
              projectId={projectId}
              taskId={task.id}
              detail={details.data}
              canUpdate={canUpdate}
              refresh={async () => (await details.refetch()).data}
            />
            <TaskEstimateBaseline
              active={active}
              taskId={task.id}
              title={task.title}
              estimate={details.data.current}
              canConfirm={canConfirm}
              getUserLabel={getTaskUserLabel}
              refreshEstimate={details.refetch}
            />
          </details>
          <details className="border-t pt-2">
            <summary className="cursor-pointer font-medium">
              改訂履歴 {details.data.history_total}件
            </summary>
            <ul className="divide-y">
              {details.data.history.map((revision) => (
                <li key={revision.task_version} className="py-2 text-sm">
                  <div>
                    {revision.method
                      ? estimateMethodLabels[revision.method]
                      : "見積を解除"}
                    　{formatEstimateHours(revision.minutes)}
                  </div>
                  {revision.actor_id != null && (
                    <p className="text-xs text-muted-foreground">
                      更新者　{getTaskUserLabel(revision.actor_id)}
                    </p>
                  )}
                  {revision.optimistic_minutes != null && (
                    <p className="text-xs text-muted-foreground">
                      楽観 {formatEstimateHours(revision.optimistic_minutes)} ／
                      最頻 {formatEstimateHours(revision.likely_minutes)} ／
                      悲観 {formatEstimateHours(revision.pessimistic_minutes)}
                    </p>
                  )}
                  {revision.change_reason && (
                    <p className="whitespace-pre-wrap wrap-anywhere">
                      {revision.change_reason}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {details.data.history_total > PAGE_SIZE && (
              <DataPagination
                page={page}
                pageSize={PAGE_SIZE}
                total={details.data.history_total}
                currentCount={details.data.history.length}
                onPageChange={setPage}
              />
            )}
          </details>
        </>
      )}
    </aside>
  );
}

function formValues(revision: TaskEstimateRevisionRead) {
  return {
    method: revision.method ?? "simple",
    hours: toHourInput(revision.minutes),
    optimistic: toHourInput(revision.optimistic_minutes),
    likely: toHourInput(revision.likely_minutes),
    pessimistic: toHourInput(revision.pessimistic_minutes),
    assumptions: revision.assumptions ?? "",
    reason: "",
  };
}

function EstimateForm({
  projectId,
  taskId,
  detail,
  refresh,
}: {
  projectId: number;
  taskId: number;
  detail: TaskEstimateRead;
  refresh: () => Promise<TaskEstimateRead | undefined>;
}) {
  const client = useQueryClient();
  const [version, setVersion] = useState<number>();
  const [draft, setDraft] = useState<ReturnType<typeof formValues>>();
  const values = draft ?? formValues(detail.current);
  const edit = (changes: Partial<typeof values>) => {
    if (version === undefined) setVersion(detail.version);
    setDraft({ ...values, ...changes });
  };
  const optimistic = parseEstimateHours(values.optimistic);
  const likely = parseEstimateHours(values.likely);
  const pessimistic = parseEstimateHours(values.pessimistic);
  const simple = values.method === "simple";
  const calculated =
    values.method === "simple"
      ? parseEstimateHours(values.hours)
      : calculateThreePointMinutes(
          values.method,
          optimistic,
          likely,
          pessimistic,
        );
  const save = useMutation({
    mutationFn: (data: TaskEstimateUpdate) =>
      updateTaskEstimateTasksTaskIdEstimatePatch(taskId, data),
    onSuccess: async () => {
      await Promise.all([
        refresh(),
        invalidateTaskProjectSurfaces(client, projectId, {
          includeBoard: true,
        }),
      ]);
      setDraft(undefined);
      setVersion(undefined);
      toast.success("見積を保存しました。");
    },
  });
  const conflict = getConflictCurrent<TaskRead>(save.error);
  return (
    <form
      data-effort-dirty={Boolean(draft)}
      data-effort-pending={save.isPending}
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (
          calculated === null ||
          version === undefined ||
          save.isPending ||
          conflict
        )
          return;
        save.mutate({
          version,
          method: values.method,
          assumptions: values.assumptions.trim() || null,
          change_reason: values.reason.trim() || null,
          ...(simple
            ? { minutes: calculated }
            : {
                optimistic_minutes: optimistic,
                likely_minutes: likely,
                pessimistic_minutes: pessimistic,
              }),
        });
      }}
    >
      <fieldset className="space-y-3 text-sm" disabled={save.isPending}>
        <label className="grid gap-1">
          見積手法
          <select
            aria-label="見積手法"
            className="h-8 rounded-md border bg-background px-2"
            value={simple ? "simple" : "three"}
            onChange={(e) =>
              edit({ method: e.target.value === "simple" ? "simple" : "pert" })
            }
          >
            <option value="simple">単純見積</option>
            <option value="three">3点見積</option>
          </select>
        </label>
        {!simple && (
          <fieldset className="grid gap-1.5 rounded-md bg-muted/40 p-2">
            <legend className="px-1 text-xs text-muted-foreground">
              計算方式
            </legend>
            {(["pert", "triangular"] as const).map((method) => (
              <label key={method} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="estimate-calculation"
                  checked={values.method === method}
                  onChange={() => edit({ method })}
                />
                {method === "pert"
                  ? "PERT（最頻値を4倍）"
                  : "三角分布（均等に平均）"}
              </label>
            ))}
          </fieldset>
        )}
        {simple ? (
          <label className="grid gap-1">
            見積工数（h）
            <Input
              type="number"
              min="0"
              step="any"
              required
              value={values.hours}
              onChange={(event) => edit({ hours: event.target.value })}
            />
          </label>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ["optimistic", "楽観（h）"],
                ["likely", "最頻（h）"],
                ["pessimistic", "悲観（h）"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="grid gap-1">
                {label}
                <Input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={values[key]}
                  onChange={(event) => edit({ [key]: event.target.value })}
                />
              </label>
            ))}
          </div>
        )}
        {!simple && calculated === null && (
          <p className="text-xs text-muted-foreground">
            楽観、最頻、悲観の順に大きくなるように入力してください。
          </p>
        )}
        <p className="rounded-md border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-3 py-2 text-[var(--status-info-fg)]">
          <span className="block text-xs">
            {simple
              ? "見積工数"
              : values.method === "pert"
                ? "PERT（楽観＋4×最頻＋悲観）÷6"
                : "三角分布（楽観＋最頻＋悲観）÷3"}
          </span>
          　
          <output className="text-xl font-semibold whitespace-nowrap tabular-nums">
            {formatEstimateHours(calculated)}
          </output>
          {calculated !== null && (
            <span className="ml-2 text-xs text-muted-foreground">
              {calculated}分
            </span>
          )}
        </p>
        <label className="grid gap-1">
          前提・不確実な点
          <Textarea
            maxLength={2000}
            value={values.assumptions}
            onChange={(event) => edit({ assumptions: event.target.value })}
          />
        </label>
        <label className="grid gap-1">
          変更理由
          <Input
            maxLength={500}
            value={values.reason}
            onChange={(event) => edit({ reason: event.target.value })}
          />
        </label>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={
            !draft || calculated === null || save.isPending || Boolean(conflict)
          }
        >
          {save.isPending ? "保存中…" : "見積を保存"}
        </Button>
        {draft && (
          <span className="self-center text-xs text-[var(--status-warning-fg)]">
            未保存
          </span>
        )}
        {draft && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={save.isPending}
            onClick={() => {
              setDraft(undefined);
              setVersion(undefined);
              save.reset();
            }}
          >
            入力を破棄
          </Button>
        )}
        {conflict && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={async () => {
              const latest = await refresh();
              if (latest) {
                setVersion(latest.version);
                save.reset();
              }
            }}
          >
            最新の版で入力を確認
          </Button>
        )}
      </div>
      <FormApiError error={save.error} />
    </form>
  );
}

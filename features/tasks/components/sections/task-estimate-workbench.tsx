"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  useListTaskEstimateMethodsProjectsProjectIdTaskEstimateMethodsGet,
} from "@/lib/api/generated/task-estimates/task-estimates";
import { useListTasksProjectsProjectIdTasksGet } from "@/lib/api/generated/tasks/tasks";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { invalidateTaskProjectSurfaces } from "../../lib/task-cache";
import {
  calculateThreePointMinutes,
  estimateMethodLabels,
  parseEstimateHours,
} from "../../lib/task-estimate";
import { effortBasisLabel, formatEstimateHours } from "../../lib/task-effort";
import { TaskEstimateBaseline } from "./task-estimate-baseline";

const PAGE_SIZE = 20;

export function TaskEstimateWorkbench({
  active,
  projectId,
  canUpdate,
  canConfirm,
}: {
  active: boolean;
  projectId: number;
  canUpdate: boolean;
  canConfirm: boolean;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState<TaskRead>();
  const list = useListTasksProjectsProjectIdTasksGet(
    projectId,
    { page, page_size: PAGE_SIZE, q: search || undefined },
    { query: { enabled: active, retry: false } },
  );
  const ids = list.data?.items.map((task) => task.id) ?? [];
  const methods =
    useListTaskEstimateMethodsProjectsProjectIdTaskEstimateMethodsGet(
      projectId,
      { task_ids: ids },
      {
        query: {
          enabled: active && ids.length > 0,
          retry: false,
          staleTime: 0,
        },
      },
    );
  const methodById = new Map(
    methods.data?.map((row) => [row.task_id, row.method]),
  );
  return (
    <section
      aria-label="工数見積"
      className="min-w-0 space-y-3 rounded-lg border p-3"
    >
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(String(new FormData(event.currentTarget).get("q")).trim());
          setPage(1);
        }}
      >
        <label className="grid max-w-sm flex-1 gap-1 text-sm">
          タスクを検索
          <Input type="search" name="q" placeholder="タスク名・ID" />
        </label>
        <Button variant="outline" size="sm" type="submit">
          検索
        </Button>
      </form>
      {list.isError && (
        <DataLoadError
          resourceName="見積対象のタスク"
          isRetrying={list.isFetching}
          onRetry={() => void list.refetch()}
        />
      )}
      {methods.isError && (
        <DataLoadError
          resourceName="見積手法"
          isRetrying={methods.isFetching}
          onRetry={() => void methods.refetch()}
        />
      )}
      {list.isPending && active && <p role="status">タスクを取得中…</p>}
      {list.data && (
        <div
          className={
            current
              ? "grid min-w-0 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,25rem)]"
              : "min-w-0"
          }
        >
          <div className="min-w-0 space-y-3">
            <div className="rounded-md border">
              <Table aria-label="タスクの見積一覧">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">作業</TableHead>
                    <TableHead scope="col">手法</TableHead>
                    <TableHead scope="col" className="text-right">
                      見積
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      実績
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.data.items.map((task) => {
                    const method = methodById.get(task.id);
                    return (
                      <TableRow key={task.id}>
                        <TableCell className="whitespace-normal">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto min-h-7 w-full justify-start px-1 text-left whitespace-normal wrap-anywhere"
                            type="button"
                            aria-expanded={current?.id === task.id}
                            onClick={() =>
                              setCurrent(
                                current?.id === task.id ? undefined : task,
                              )
                            }
                          >
                            {task.title}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {method ? estimateMethodLabels[method] : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatEstimateHours(task.estimated_minutes)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatEstimateHours(task.actual_minutes)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!list.data.total && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        対象タスクはありません。
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {list.data.total > PAGE_SIZE && (
              <DataPagination
                page={page}
                pageSize={PAGE_SIZE}
                total={list.data.total}
                currentCount={list.data.items.length}
                onPageChange={setPage}
              />
            )}
          </div>
          {current && (
            <EstimatePanel
              key={current.id}
              active={active}
              projectId={projectId}
              task={current}
              canUpdate={canUpdate}
              canConfirm={canConfirm}
              onClose={() => setCurrent(undefined)}
            />
          )}
        </div>
      )}
    </section>
  );
}

function EstimatePanel({
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
  return (
    <aside
      aria-label={`${task.title}の見積詳細`}
      className="min-w-0 space-y-3 rounded-md border p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-medium wrap-anywhere">{task.title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          閉じる
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        集計上の見積根拠　{effortBasisLabel(task.estimated_basis)}
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
          <TaskEstimateBaseline
            active={active}
            taskId={task.id}
            title={task.title}
            estimate={details.data.current}
            canConfirm={canConfirm}
            getUserLabel={getTaskUserLabel}
            refreshEstimate={details.refetch}
          />
          {canUpdate ? (
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

const toHourInput = (minutes?: number | null) =>
  minutes == null ? "" : String(Number((minutes / 60).toFixed(4)));

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
      <fieldset className="space-y-3" disabled={save.isPending}>
        <label className="grid gap-1">
          手法
          <select
            className="h-8 rounded-md border bg-background px-2"
            value={values.method}
            onChange={(event) =>
              edit({ method: event.target.value as typeof values.method })
            }
          >
            {Object.entries(estimateMethodLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
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
        <p className="rounded-md bg-muted px-3 py-2">
          試算　
          <output className="font-semibold tabular-nums">
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
          見積を保存
        </Button>
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

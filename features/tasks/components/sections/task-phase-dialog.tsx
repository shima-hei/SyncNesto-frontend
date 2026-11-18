"use client";

import { useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ConflictResolutionDialog } from "@/components/shared/dialogs/conflict-resolution-dialog";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { getConflictCurrent, getConflictFields } from "@/lib/api/conflict";
import type {
  EffortMetric,
  EffortSummary,
  EffortTotals,
  PhaseRead,
  PhaseUpdate,
} from "@/lib/api/generated/model";
import {
  createPhaseProjectsProjectIdPhasesPost,
  updatePhaseProjectsProjectIdPhasesPhaseIdPatch,
  useListPhasesProjectsProjectIdPhasesGet,
  useEffortSummaryProjectsProjectIdTasksEffortSummaryGet,
} from "@/lib/api/generated/tasks/tasks";
import { invalidateTaskProjectSurfaces } from "../../lib/task-cache";
import { formatEffortAmount, formatEffortMetric } from "../../lib/task-effort";
import { getTaskStatusLabel } from "../../constants/task-options";
import { TaskUserSelectField } from "../forms/task-user-select-field";
import { useTaskUserMap } from "../../hooks/use-task-user-map";

type PhaseValues = { name: string; sortOrder: string; archived: string };
const phaseValues = (phase: PhaseRead | null): PhaseValues => ({
  name: phase?.name ?? "",
  sortOrder: String(phase?.sort_order ?? 0),
  archived: String(Boolean(phase?.archived_at)),
});

export function TaskPhaseDialog({ projectId }: { projectId: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          工程・工数
        </Button>
      </DialogTrigger>
      <DialogContent className="min-w-0 max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>工程・工数</DialogTitle>
          <DialogDescription>
            プロジェクト全体の見積・実績を集計します。
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <>
            <ProjectEffortSummary projectId={projectId} />
            <PhaseManagement projectId={projectId} />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PhaseManagement({ projectId }: { projectId: number }) {
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{
    phase: PhaseRead | null;
    action: "edit" | "archive" | "restore";
  } | null>(null);
  const phases = useListPhasesProjectsProjectIdPhasesGet(
    projectId,
    { page, page_size: 20, include_archived: true },
    { query: { retry: false } },
  );
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const canManage = currentProjectRole?.role?.key === "project_admin";
  const editorTrigger = useRef<HTMLButtonElement | null>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {phases.error ? (
        <DataLoadError
          resourceName="工程"
          isRetrying={phases.isFetching}
          onRetry={() => void phases.refetch()}
        />
      ) : null}
      {phases.isPending ? <p role="status">工程を取得しています。</p> : null}
      <div className="flex items-center justify-between gap-2">
        <h3 ref={listHeading} tabIndex={-1} className="font-medium">
          工程一覧
        </h3>
        {canManage ? (
          <Button
            type="button"
            onClick={(event) => {
              editorTrigger.current = event.currentTarget;
              setEditor({ phase: null, action: "edit" });
            }}
          >
            工程を追加
          </Button>
        ) : null}
      </div>
      <ul className="flex flex-col gap-3">
        {phases.data?.items.map((phase) => (
          <li
            key={phase.id}
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <span>
              {phase.name}
              {phase.archived_at ? "（アーカイブ済み）" : ""}・
              {phase.task_count}件
            </span>
            {canManage ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`${phase.name}を編集`}
                  onClick={(event) => {
                    editorTrigger.current = event.currentTarget;
                    setEditor({ phase, action: "edit" });
                  }}
                >
                  編集
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`${phase.name}を${phase.archived_at ? "復元" : "アーカイブ"}`}
                  onClick={(event) => {
                    editorTrigger.current = event.currentTarget;
                    setEditor({
                      phase,
                      action: phase.archived_at ? "restore" : "archive",
                    });
                  }}
                >
                  {phase.archived_at ? "復元" : "アーカイブ"}
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {phases.data?.total === 0 ? <p>工程はまだありません。</p> : null}
      {phases.data && phases.data.total > 20 ? (
        <DataPagination
          page={page}
          pageSize={20}
          total={phases.data.total}
          currentCount={phases.data.items.length}
          onPageChange={setPage}
        />
      ) : null}
      {editor ? (
        <PhaseEditor
          projectId={projectId}
          phase={editor.phase}
          action={editor.action}
          onClose={() => setEditor(null)}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const trigger = editorTrigger.current;
            (trigger?.isConnected ? trigger : listHeading.current)?.focus();
          }}
        />
      ) : null}
    </div>
  );
}

export function ProjectEffortSummary({
  projectId,
  showHours = false,
  onOpenGanttForAssignee,
}: {
  projectId: number;
  showHours?: boolean;
  onOpenGanttForAssignee?: (assigneeId: number) => void;
}) {
  const [assigneeId, setAssigneeId] = useState("");
  const { getTaskUserLabel } = useTaskUserMap(projectId);
  const summary = useEffortSummaryProjectsProjectIdTasksEffortSummaryGet(
    projectId,
    assigneeId ? { assignee_id: Number(assigneeId) } : undefined,
    { query: { retry: false } },
  );
  return (
    <>
      <TaskUserSelectField
        projectId={projectId}
        label="担当者で集計を絞る"
        value={assigneeId}
        placeholder="すべての担当者"
        onChange={setAssigneeId}
      />
      <ProjectEffortResult
        query={summary}
        showHours={showHours}
        getTaskUserLabel={getTaskUserLabel}
        onOpenGanttForAssignee={onOpenGanttForAssignee}
      />
    </>
  );
}

function ProjectEffortResult({
  query: summary,
  showHours,
  getTaskUserLabel,
  onOpenGanttForAssignee,
}: {
  showHours: boolean;
  getTaskUserLabel: (id: number) => string;
  onOpenGanttForAssignee?: (assigneeId: number) => void;
  query: ReturnType<
    typeof useEffortSummaryProjectsProjectIdTasksEffortSummaryGet<EffortSummary>
  >;
}) {
  if (summary.error) {
    return (
      <DataLoadError
        resourceName="工数集計"
        isRetrying={summary.isFetching}
        onRetry={() => void summary.refetch()}
      />
    );
  }
  if (!summary.data) return <p role="status">工数集計を取得しています。</p>;
  const { totals, groups, status_groups, assignee_groups } = summary.data;
  return (
    <>
      {summary.isFetching ? (
        <p role="status">工数集計を更新しています。</p>
      ) : null}
      <dl
        className={`grid gap-3 sm:grid-cols-2 ${showHours ? "lg:grid-cols-4" : ""}`}
      >
        <EffortTotal
          label="見積"
          metric={totals.estimated}
          showHours={showHours}
        />
        {showHours && (
          <EffortTotal label="計画工数" metric={totals.planned} showHours />
        )}
        <EffortTotal
          label="実績"
          metric={totals.actual}
          showHours={showHours}
        />
        {showHours && (
          <EffortTotal label="残工数" metric={totals.remaining} showHours />
        )}
      </dl>
      {totals.task_count ? (
        <>
          {showHours && assignee_groups?.length ? (
            <section aria-label="担当者別の負荷" className="space-y-2">
              <h3 className="font-medium">担当者別の負荷</h3>
              <p className="text-xs text-muted-foreground">
                残工数は完了・中止を除いた入力済みの工数を集計します。
              </p>
              <EffortBreakdown
                showHours
                showActions={Boolean(onOpenGanttForAssignee)}
                rows={assignee_groups.map(
                  ({ assignee_id, totals: assigneeTotals }) => {
                    const label =
                      assignee_id == null
                        ? "担当なし"
                        : getTaskUserLabel(assignee_id);
                    return {
                      id: String(assignee_id ?? "unassigned"),
                      label,
                      totals: assigneeTotals,
                      action:
                        assignee_id != null && onOpenGanttForAssignee ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label={`${label}のガントを表示`}
                            onClick={() => onOpenGanttForAssignee(assignee_id)}
                          >
                            ガントで確認
                          </Button>
                        ) : null,
                    };
                  },
                )}
              />
            </section>
          ) : null}
          <details className="min-w-0">
            <summary className="cursor-pointer py-2 text-sm font-medium">
              工程別の内訳
            </summary>
            <EffortBreakdown
              showHours={showHours}
              rows={groups.map((group) => ({
                label: group.phase
                  ? `${group.phase.name}${group.phase.archived_at ? "（アーカイブ済み）" : ""}`
                  : group.kind === "shared"
                    ? "共通作業"
                    : "未分類",
                id: `${group.kind}:${group.phase?.id ?? "none"}`,
                totals: group.totals,
              }))}
            />
          </details>
          <details className="min-w-0">
            <summary className="cursor-pointer py-2 text-sm font-medium">
              状態別の内訳
            </summary>
            <EffortBreakdown
              showHours={showHours}
              rows={status_groups.map((group) => ({
                label: getTaskStatusLabel(group.status),
                id: group.status,
                totals: group.totals,
              }))}
            />
          </details>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          集計対象のタスクはありません。
        </p>
      )}
    </>
  );
}

function EffortTotal({
  label,
  metric,
  showHours,
}: {
  label: string;
  metric?: EffortMetric;
  showHours: boolean;
}) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="text-sm font-medium">
        {label}
        {metric && !metric.complete ? "（確認済み小計）" : ""}
      </dt>
      <dd className="text-lg font-semibold tabular-nums">
        {metric ? formatEffortAmount(metric.minutes ?? 0, showHours) : "未取得"}
      </dd>
      {metric && !metric.complete ? (
        <dd className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
          {metric.missing_count ? (
            <span>未入力 {metric.missing_count}件</span>
          ) : null}
          {metric.unreviewed_count ? (
            <span>未確認 {metric.unreviewed_count}件</span>
          ) : null}
        </dd>
      ) : null}
    </div>
  );
}

function EffortBreakdown({
  rows,
  showHours,
  showActions = false,
}: {
  rows: {
    id: string;
    label: string;
    totals: EffortTotals;
    action?: ReactNode;
  }[];
  showHours: boolean;
  showActions?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">区分</TableHead>
          <TableHead scope="col">件数</TableHead>
          <TableHead scope="col">見積</TableHead>
          {showHours && <TableHead scope="col">計画</TableHead>}
          <TableHead scope="col">実績</TableHead>
          {showHours && <TableHead scope="col">残工数</TableHead>}
          {showHours && <TableHead scope="col">差（実績−計画）</TableHead>}
          {showActions && <TableHead scope="col">日程</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ id, label, totals, action }) => {
          const difference =
            totals.actual?.complete && totals.planned?.complete
              ? (totals.actual.minutes ?? 0) - (totals.planned.minutes ?? 0)
              : null;
          return (
            <TableRow key={id}>
              <TableCell>{label}</TableCell>
              <TableCell className="tabular-nums">
                {totals.task_count}
              </TableCell>
              <TableCell>
                {formatEffortMetric(totals.estimated, showHours)}
              </TableCell>
              {showHours && (
                <TableCell>
                  {formatEffortMetric(totals.planned, showHours)}
                </TableCell>
              )}
              <TableCell>
                {formatEffortMetric(totals.actual, showHours)}
              </TableCell>
              {showHours && (
                <TableCell>
                  {formatEffortMetric(totals.remaining, showHours)}
                </TableCell>
              )}
              {showHours && (
                <TableCell className="tabular-nums">
                  {difference === null
                    ? "—"
                    : `${difference > 0 ? "+" : ""}${formatEffortAmount(difference, showHours)}`}
                </TableCell>
              )}
              {showActions && <TableCell>{action}</TableCell>}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function PhaseEditor({
  projectId,
  phase,
  action,
  onClose,
  onCreated,
  onCloseAutoFocus,
}: {
  projectId: number;
  phase: PhaseRead | null;
  action: "edit" | "archive" | "restore";
  onClose: () => void;
  onCreated?: (phase: PhaseRead) => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const [values, setValues] = useState<PhaseValues>(() => ({
    ...phaseValues(phase),
    ...(action !== "edit" ? { archived: String(action === "archive") } : {}),
  }));
  const [error, setError] = useState<Error | null>(null);
  const [pending, setPending] = useState(false);
  const [current, setCurrent] = useState<PhaseRead | null>(null);
  const client = useQueryClient();
  const cancelButton = useRef<HTMLButtonElement>(null);
  const save = async (
    next: PhaseValues,
    baseline: PhaseRead | null = phase,
  ) => {
    setPending(true);
    setError(null);
    try {
      let created: PhaseRead | undefined;
      if (baseline) {
        const original = phaseValues(baseline);
        const data: PhaseUpdate = { version: baseline.version };
        if (next.name !== original.name) data.name = next.name.trim();
        if (next.sortOrder !== original.sortOrder)
          data.sort_order = Number(next.sortOrder);
        if (next.archived !== original.archived)
          data.archived = next.archived === "true";
        await updatePhaseProjectsProjectIdPhasesPhaseIdPatch(
          projectId,
          baseline.id,
          data,
        );
      } else
        created = await createPhaseProjectsProjectIdPhasesPost(projectId, {
          name: next.name.trim(),
          sort_order: Number(next.sortOrder),
        });
      await invalidateTaskProjectSurfaces(client, projectId);
      if (created) onCreated?.(created);
      onClose();
    } catch (error) {
      setError(error as Error);
      setCurrent(getConflictCurrent<PhaseRead>(error));
    } finally {
      setPending(false);
    }
  };
  const changed = { ...phaseValues(current) };
  for (const key of Object.keys(values) as (keyof PhaseValues)[])
    if (values[key] !== phaseValues(phase)[key]) changed[key] = values[key];
  return (
    <>
      <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
        <DialogContent
          onOpenAutoFocus={(event) => {
            if (action === "edit") return;
            event.preventDefault();
            cancelButton.current?.focus();
          }}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <DialogHeader>
            <DialogTitle>
              {action === "archive"
                ? "工程をアーカイブ"
                : action === "restore"
                  ? "工程を復元"
                  : phase
                    ? "工程を編集"
                    : "工程を追加"}
            </DialogTitle>
            <DialogDescription>
              {action === "archive"
                ? `${phase?.task_count ?? 0}件のタスクの所属・工数・日程・履歴を保持します。新しい割当候補から外し、集計には含めます。`
                : "工程の表示順はタスクの依存や日程を変更しません。同じ名称はアーカイブ済み工程も含めて重複できません。"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save(values);
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="phase-name">工程名</FieldLabel>
                <Input
                  id="phase-name"
                  value={values.name}
                  maxLength={100}
                  required
                  disabled={action !== "edit"}
                  onChange={(event) =>
                    setValues((value) => ({
                      ...value,
                      name: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="phase-sort">表示順</FieldLabel>
                <Input
                  id="phase-sort"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={values.sortOrder}
                  disabled={action !== "edit"}
                  onChange={(event) =>
                    setValues((value) => ({
                      ...value,
                      sortOrder: event.target.value,
                    }))
                  }
                />
              </Field>
              <FormApiError error={error} />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  ref={cancelButton}
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={onClose}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={
                    pending || !values.name.trim() || values.sortOrder === ""
                  }
                >
                  {pending
                    ? "保存中…"
                    : action === "archive"
                      ? "アーカイブする"
                      : action === "restore"
                        ? "復元する"
                        : "保存する"}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
      {current ? (
        <ConflictResolutionDialog
          open
          fields={getConflictFields({
            original: phaseValues(phase),
            local: values,
            current: phaseValues(current),
          })}
          localValues={changed}
          currentValues={phaseValues(current)}
          fieldLabels={{
            name: "工程名",
            sortOrder: "表示順",
            archived: "アーカイブ状態",
          }}
          isPending={pending}
          onOpenChange={(open) => !open && setCurrent(null)}
          onResolve={(resolved) => {
            setValues(resolved);
            return save(resolved, current);
          }}
        />
      ) : null}
    </>
  );
}

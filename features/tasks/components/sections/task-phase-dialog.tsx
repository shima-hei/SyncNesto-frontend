"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ConflictResolutionDialog } from "@/components/shared/dialogs/conflict-resolution-dialog";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import type { PhaseRead, PhaseUpdate } from "@/lib/api/generated/model";
import {
  createPhaseProjectsProjectIdPhasesPost,
  updatePhaseProjectsProjectIdPhasesPhaseIdPatch,
  useListPhasesProjectsProjectIdPhasesGet,
  useEffortSummaryProjectsProjectIdTasksEffortSummaryGet,
} from "@/lib/api/generated/tasks/tasks";
import { invalidateTaskProjectSurfaces } from "../../lib/task-cache";
import { formatEffortMetric } from "../../lib/task-effort";

type PhaseValues = { name: string; sortOrder: string; archived: string };
const phaseValues = (phase: PhaseRead | null): PhaseValues => ({
  name: phase?.name ?? "",
  sortOrder: String(phase?.sort_order ?? 0),
  archived: String(Boolean(phase?.archived_at)),
});

export function TaskPhaseDialog({ projectId }: { projectId: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        工程・工数
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="min-w-0 max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>工程・工数</DialogTitle>
            <DialogDescription>
              プロジェクト全体の工数です。一覧・ボード・ガントの表示条件やページ、折り畳みとは独立しています。
            </DialogDescription>
          </DialogHeader>
          {open ? <PhaseOverview projectId={projectId} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PhaseOverview({ projectId }: { projectId: number }) {
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
  const summary = useEffortSummaryProjectsProjectIdTasksEffortSummaryGet(
    projectId,
    undefined,
    { query: { retry: false } },
  );
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const canManage = currentProjectRole?.role?.key === "project_admin";
  const errors = phases.error ?? summary.error;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {errors ? <FormApiError error={errors} /> : null}
      {phases.isPending || summary.isPending ? (
        <p role="status">工程・工数を取得しています。</p>
      ) : null}
      {summary.isFetching && !summary.isPending ? (
        <p role="status">工数を更新しています。</p>
      ) : null}
      {summary.data && !summary.isError ? (
        <>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt>全体の見積</dt>
              <dd>{formatEffortMetric(summary.data.totals.estimated)}</dd>
            </div>
            <div>
              <dt>全体の実績</dt>
              <dd>{formatEffortMetric(summary.data.totals.actual)}</dd>
            </div>
          </dl>
          <p className="text-sm text-muted-foreground">
            未分類・共通作業・アーカイブ済み工程も合計に含みます。未入力や未確認があれば確定総工数として扱いません。
          </p>
          <p className="text-xs text-muted-foreground sm:hidden">
            表は横にスクロールできます。
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>所属</TableHead>
                <TableHead>件数</TableHead>
                <TableHead>見積</TableHead>
                <TableHead>実績</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.data.groups.map((group) => (
                <TableRow key={`${group.kind}:${group.phase?.id ?? "none"}`}>
                  <TableCell>
                    {group.phase
                      ? `${group.phase.name}${group.phase.archived_at ? "（アーカイブ済み）" : ""}`
                      : group.kind === "shared"
                        ? "共通作業"
                        : "未分類"}
                  </TableCell>
                  <TableCell>{group.totals.task_count}</TableCell>
                  <TableCell>
                    {formatEffortMetric(group.totals.estimated)}
                  </TableCell>
                  <TableCell>
                    {formatEffortMetric(group.totals.actual)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">工程一覧</h3>
        {canManage ? (
          <Button
            type="button"
            onClick={() => setEditor({ phase: null, action: "edit" })}
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
                  onClick={() => setEditor({ phase, action: "edit" })}
                >
                  編集
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditor({
                      phase,
                      action: phase.archived_at ? "restore" : "archive",
                    })
                  }
                >
                  {phase.archived_at ? "復元" : "アーカイブ"}
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {phases.data?.total === 0 ? <p>工程はまだありません。</p> : null}
      {phases.data ? (
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
        />
      ) : null}
    </div>
  );
}

function PhaseEditor({
  projectId,
  phase,
  action,
  onClose,
}: {
  projectId: number;
  phase: PhaseRead | null;
  action: "edit" | "archive" | "restore";
  onClose: () => void;
}) {
  const [values, setValues] = useState<PhaseValues>(() => ({
    ...phaseValues(phase),
    ...(action !== "edit" ? { archived: String(action === "archive") } : {}),
  }));
  const [error, setError] = useState<Error | null>(null);
  const [pending, setPending] = useState(false);
  const [current, setCurrent] = useState<PhaseRead | null>(null);
  const client = useQueryClient();
  const save = async (
    next: PhaseValues,
    baseline: PhaseRead | null = phase,
  ) => {
    setPending(true);
    setError(null);
    try {
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
        await createPhaseProjectsProjectIdPhasesPost(projectId, {
          name: next.name.trim(),
          sort_order: Number(next.sortOrder),
        });
      await invalidateTaskProjectSurfaces(client, projectId);
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
        <DialogContent>
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

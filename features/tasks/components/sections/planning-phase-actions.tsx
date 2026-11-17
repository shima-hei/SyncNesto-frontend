"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { FolderPlusIcon, PlusIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
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
import { getConflictCurrent } from "@/lib/api/conflict";
import type {
  PhaseAssignment,
  PhaseRead,
  TaskRead,
} from "@/lib/api/generated/model";
import {
  createPhaseProjectsProjectIdPhasesPost,
  updatePhaseProjectsProjectIdPhasesPhaseIdPatch,
  useEffortSummaryProjectsProjectIdTasksEffortSummaryGet,
} from "@/lib/api/generated/tasks/tasks";

import type { usePlanningPhases } from "../../hooks/use-planning-phases";
import type { TaskPlanningController } from "../../hooks/use-task-planning";
import { useGanttOrder } from "../../hooks/use-gantt-order";
import { invalidateTaskProjectSurfaces } from "../../lib/task-cache";
import { formatEffortMetric } from "../../lib/task-effort";
import { phaseColors } from "../../lib/phase-colors";
import { GANTT_ORDER_ROW, GanttOrderHandle } from "../gantt/gantt-order-handle";
import { PlanningPlacementDialog } from "./planning-placement-dialog";
import { PhaseEditor } from "./task-phase-dialog";
import { PhaseDetailPanel } from "./phase-detail-panel";

export function PlanningPhaseActions({
  active,
  projectId,
  phases,
  tasks,
  canManage,
  canCreate,
  canUpdate,
  planning,
}: {
  active: boolean;
  projectId: number;
  phases: ReturnType<typeof usePlanningPhases>;
  tasks: TaskRead[] | undefined;
  canManage: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  planning: TaskPlanningController;
}) {
  const client = useQueryClient();
  const order = useGanttOrder(projectId);
  const [nameEditor, setNameEditor] = useState<PhaseRead | null | undefined>();
  const [archiveTarget, setArchiveTarget] = useState<PhaseRead>();
  const [showArchived, setShowArchived] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<PhaseAssignment>();
  const [placementOpen, setPlacementOpen] = useState(false);
  const [newPhaseId, setNewPhaseId] = useState<number>();
  const [result, setResult] = useState<{ message: string; task?: TaskRead }>();
  const createTrigger = useRef<HTMLButtonElement>(null);
  const placementTrigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const archiveTrigger = useRef<HTMLButtonElement>(null);
  const detailsTrigger = useRef<HTMLButtonElement>(null);
  const placedTask = result?.task;
  const allPhases = phases.data ?? [];
  const activePhases = allPhases.filter((phase) => !phase.archived_at);
  const visiblePhases = showArchived ? allPhases : activePhases;
  const selectedPhaseDetails = allPhases.find(
    (phase) => phase.id === selectedPhase?.phase_id,
  );
  const closeDetails = () => {
    setSelectedPhase(undefined);
    requestAnimationFrame(() => {
      (detailsTrigger.current?.isConnected
        ? detailsTrigger.current
        : heading.current
      )?.focus({ preventScroll: true });
    });
  };
  const summary = useEffortSummaryProjectsProjectIdTasksEffortSummaryGet(
    projectId,
    undefined,
    { query: { retry: false, enabled: active } },
  );
  const groups = new Map(
    summary.data?.groups.map((group) => [
      group.phase ? `phase:${group.phase.id}` : group.kind,
      group.totals,
    ]),
  );
  const closeNameEditor = () => {
    setNameEditor(undefined);
    requestAnimationFrame(() =>
      (nameEditor === null ? createTrigger.current : heading.current)?.focus({
        preventScroll: true,
      }),
    );
  };
  const saveName = useMutation({
    mutationFn: ({ name, phase }: { name: string; phase: PhaseRead | null }) =>
      phase
        ? updatePhaseProjectsProjectIdPhasesPhaseIdPatch(projectId, phase.id, {
            version: phase.version,
            name,
          })
        : createPhaseProjectsProjectIdPhasesPost(projectId, {
            name,
            sort_order:
              allPhases.reduce(
                (last, row) => Math.max(last, row.sort_order),
                -1,
              ) + 1,
          }),
    onSuccess: async (phase, { phase: previous }) => {
      await invalidateTaskProjectSurfaces(client, projectId);
      if (!previous) setNewPhaseId(phase.id);
      setResult({
        message: `工程「${phase.name}」を${previous ? "更新" : "追加"}しました。`,
      });
      closeNameEditor();
    },
  });
  const canPlace =
    canUpdate &&
    Boolean(phases.data) &&
    !phases.isError &&
    Boolean(tasks?.length);

  const editName = (phase: PhaseRead | null) => {
    saveName.reset();
    setNameEditor(phase);
  };
  const conflict = getConflictCurrent<PhaseRead>(saveName.error);
  const nameForm = (phase: PhaseRead | null) => (
    <form
      className="flex min-w-0 flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const name = String(
          new FormData(event.currentTarget).get("name"),
        ).trim();
        if (name && name !== phase?.name && !conflict && !saveName.isPending)
          saveName.mutate({ name, phase });
      }}
    >
      <Input
        name="name"
        aria-label="工程名"
        className="min-w-28 flex-1"
        defaultValue={phase?.name ?? ""}
        required
        maxLength={100}
        autoFocus
        disabled={saveName.isPending}
      />
      <Button
        size="sm"
        type="submit"
        disabled={saveName.isPending || Boolean(conflict)}
      >
        {phase ? "保存" : "追加"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        type="button"
        disabled={saveName.isPending}
        onClick={closeNameEditor}
      >
        キャンセル
      </Button>
      {conflict ? (
        <div role="alert" className="basis-full text-sm">
          工程が更新されています。最新の名前は「{conflict.name}」です。
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => editName(conflict)}
          >
            最新の版で編集
          </Button>
        </div>
      ) : (
        <FormApiError error={saveName.error} />
      )}
    </form>
  );

  return (
    <section
      aria-label="工程一覧"
      className="flex min-w-0 flex-col gap-2 rounded-lg border p-3"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 ref={heading} tabIndex={-1} className="text-sm font-medium">
          工程一覧
        </h2>
        {phases.isPending ? (
          <span role="status" className="text-sm text-muted-foreground">
            工程を取得中…
          </span>
        ) : null}
        {phases.data && !phases.isError ? (
          <p className="text-sm text-muted-foreground">
            {activePhases.length
              ? `有効な工程 ${activePhases.length}件`
              : "有効な工程はありません"}
            {summary.isSuccess
              ? ` · 未分類 ${groups.get("unclassified")?.task_count ?? 0}件`
              : ""}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <Button
              ref={createTrigger}
              type="button"
              size="sm"
              disabled={
                !phases.isSuccess || nameEditor !== undefined || order.isPending
              }
              onClick={() => editName(null)}
            >
              <PlusIcon data-icon="inline-start" />
              {phases.data?.length === 0 ? "最初の工程を追加" : "工程を追加"}
            </Button>
          ) : null}
          {canCreate ? (
            <Button asChild type="button" variant="outline" size="sm">
              <Link href={`/projects/joined/${projectId}/tasks`}>
                タスク一覧で登録
              </Link>
            </Button>
          ) : null}
          {canUpdate ? (
            <Button
              ref={placementTrigger}
              type="button"
              size="sm"
              variant="outline"
              disabled={!canPlace}
              onClick={() => setPlacementOpen(true)}
            >
              <FolderPlusIcon data-icon="inline-start" />
              所属を変更
            </Button>
          ) : null}
        </div>
      </div>
      {phases.isError ? (
        <DataLoadError
          resourceName="工程"
          isRetrying={phases.isFetching}
          onRetry={() => void phases.refetch()}
        />
      ) : null}
      {summary.isError ? (
        <DataLoadError
          resourceName="工数"
          isRetrying={summary.isFetching}
          onRetry={() => void summary.refetch()}
        />
      ) : null}
      {phases.isSuccess && (
        <>
          <div
            className={
              selectedPhase
                ? "grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]"
                : "min-w-0"
            }
          >
            <div
              data-gantt-scroll
              className="max-h-[60dvh] overflow-auto rounded-md border"
            >
              <Table aria-label="工程と工数">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">工程</TableHead>
                    <TableHead scope="col" className="text-right">
                      タスク
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      見積
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      実績
                    </TableHead>
                    {canManage && <TableHead scope="col">操作</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiblePhases.map((phase, index) => {
                    const totals = groups.get(`phase:${phase.id}`);
                    return (
                      <TableRow
                        key={phase.id}
                        className={GANTT_ORDER_ROW}
                        data-gantt-order-id={phase.id}
                        data-gantt-order-group="planning-phases"
                      >
                        <TableCell className="whitespace-normal">
                          {nameEditor?.id === phase.id ? (
                            nameForm(nameEditor)
                          ) : (
                            <div className="flex min-w-0 items-center gap-1">
                              {canManage && visiblePhases.length > 1 && (
                                <GanttOrderHandle
                                  id={phase.id}
                                  group="planning-phases"
                                  label={phase.name}
                                  previous={visiblePhases[index - 1]?.id}
                                  next={visiblePhases[index + 1]?.id}
                                  disabled={
                                    order.isPending || nameEditor !== undefined
                                  }
                                  save={(move, label, trigger) =>
                                    order.mutate({
                                      kind: "phase",
                                      move,
                                      label,
                                      trigger,
                                    })
                                  }
                                />
                              )}
                              {phase.color && (
                                <span
                                  aria-hidden="true"
                                  className={`size-2.5 shrink-0 rounded-full ${phaseColors[phase.color].className}`}
                                />
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto min-h-7 min-w-20 max-w-96 justify-start px-1 whitespace-normal wrap-anywhere"
                                aria-expanded={
                                  selectedPhase?.phase_id === phase.id
                                }
                                onClick={(event) => {
                                  detailsTrigger.current = event.currentTarget;
                                  if (selectedPhase?.phase_id === phase.id)
                                    closeDetails();
                                  else
                                    setSelectedPhase({
                                      kind: "phase",
                                      phase_id: phase.id,
                                    });
                                }}
                              >
                                {phase.name}
                                {phase.archived_at && (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    アーカイブ済み
                                  </span>
                                )}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {phase.task_count}
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-normal">
                          {summary.isSuccess
                            ? formatEffortMetric(
                                totals?.estimated ??
                                  (phase.task_count === 0
                                    ? { minutes: 0 }
                                    : null),
                              )
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-normal">
                          {summary.isSuccess
                            ? formatEffortMetric(
                                totals?.actual ??
                                  (phase.task_count === 0
                                    ? { minutes: 0 }
                                    : null),
                              )
                            : "—"}
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={
                                nameEditor !== undefined || order.isPending
                              }
                              aria-label={`${phase.name}を編集`}
                              onClick={() => editName(phase)}
                            >
                              編集
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={
                                nameEditor !== undefined || order.isPending
                              }
                              aria-label={`${phase.name}を${phase.archived_at ? "復元" : "アーカイブ"}`}
                              onClick={(event) => {
                                archiveTrigger.current = event.currentTarget;
                                setArchiveTarget(phase);
                              }}
                            >
                              {phase.archived_at ? "復元" : "アーカイブ"}
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {nameEditor === null && (
                    <TableRow>
                      <TableCell colSpan={5}>{nameForm(null)}</TableCell>
                    </TableRow>
                  )}
                  {(
                    [
                      ["shared", "共通作業"],
                      ["unclassified", "未分類"],
                    ] as const
                  ).map(([key, label]) => {
                    const totals = groups.get(key);
                    return (
                      <TableRow key={key} className="bg-muted/30">
                        <TableCell className="font-medium">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="px-1"
                            aria-expanded={selectedPhase?.kind === key}
                            onClick={(event) => {
                              detailsTrigger.current = event.currentTarget;
                              if (selectedPhase?.kind === key) closeDetails();
                              else setSelectedPhase({ kind: key });
                            }}
                          >
                            {label}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {summary.isSuccess ? (totals?.task_count ?? 0) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-normal">
                          {totals ? formatEffortMetric(totals.estimated) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-normal">
                          {totals ? formatEffortMetric(totals.actual) : "—"}
                        </TableCell>
                        {canManage && <TableCell />}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {selectedPhase && (
              <PhaseDetailPanel
                key={`${selectedPhase.kind}:${selectedPhase.phase_id ?? ""}`}
                projectId={projectId}
                active={active}
                selection={selectedPhase}
                phase={selectedPhaseDetails}
                phases={allPhases}
                canManage={canManage}
                canUpdate={canUpdate && !planning.pendingDraft}
                onClose={closeDetails}
              />
            )}
          </div>
          {allPhases.some((phase) => phase.archived_at) && (
            <Button
              type="button"
              variant={showArchived ? "secondary" : "outline"}
              size="sm"
              className="self-start"
              aria-pressed={showArchived}
              disabled={Boolean(nameEditor) || order.isPending}
              onClick={() => setShowArchived(!showArchived)}
            >
              アーカイブ済みも表示
            </Button>
          )}
        </>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <p role="status" className="text-sm">
          {result?.message}
        </p>
        {placedTask && canUpdate ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={Boolean(planning.pendingDraft)}
            onClick={(event) =>
              planning.openEditor(placedTask, event.currentTarget)
            }
          >
            このタスクの計画を編集
          </Button>
        ) : null}
      </div>
      {archiveTarget ? (
        <PhaseEditor
          projectId={projectId}
          phase={archiveTarget}
          action={archiveTarget.archived_at ? "restore" : "archive"}
          onClose={() => setArchiveTarget(undefined)}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            (archiveTrigger.current?.isConnected
              ? archiveTrigger.current
              : heading.current
            )?.focus();
          }}
        />
      ) : null}
      {placementOpen ? (
        <PlanningPlacementDialog
          projectId={projectId}
          phases={phases.data ?? []}
          initialPhaseId={newPhaseId}
          tasks={tasks ?? []}
          planning={planning}
          canUpdate={canUpdate && !phases.isError}
          onClose={() => setPlacementOpen(false)}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            (canPlace ? placementTrigger : createTrigger).current?.focus();
          }}
          onSaved={(task, destination) => {
            setResult({
              message: `「${task.title}」の所属を「${destination.label}」に変更しました。`,
              task,
            });
            setNewPhaseId(destination.assignment.phase_id ?? undefined);
            setPlacementOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}

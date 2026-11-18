"use client";

import Link from "next/link";
import { Fragment, useRef, useState } from "react";
import {
  FolderPlusIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Settings2Icon,
  LayersIcon,
  ClipboardListIcon,
  Clock3Icon,
  TimerIcon,
} from "lucide-react";
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
} from "@/lib/api/generated/tasks/tasks";

import type { usePlanningPhases } from "../../hooks/use-planning-phases";
import type { TaskPlanningController } from "../../hooks/use-task-planning";
import { useGanttOrder } from "../../hooks/use-gantt-order";
import { invalidateTaskProjectSurfaces } from "../../lib/task-cache";
import {
  sumMeasure,
  groupEffortTasks,
  phaseKey,
} from "../../lib/effort-workspace";
import { measureNote, measureValue } from "./effort-controls";
import styles from "./effort-workspace.module.css";
import { phaseColors } from "../../lib/phase-colors";
import { GANTT_ORDER_ROW, GanttOrderHandle } from "../gantt/gantt-order-handle";
import { PlanningPlacementDialog } from "./planning-placement-dialog";
import { PhaseEditor } from "./task-phase-dialog";
import { PhaseDetailPanel, PhaseTaskRows } from "./phase-detail-panel";

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
  const [expanded, setExpanded] = useState<string[]>([]);
  const groups = groupEffortTasks(tasks ?? [], phaseKey);
  const toggle = (key: string) =>
    setExpanded((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  const metric = (members: TaskRead[], key: "estimated" | "actual") => {
    const total = sumMeasure(members, key);
    return (
      <span title={measureNote(total)}>
        {tasks ? measureValue(total) : "—"}
        {total.entered > 0 && measureNote(total) && (
          <small className="block text-muted-foreground">
            {measureNote(total)}
          </small>
        )}
      </span>
    );
  };
  const taskRows = (key: string, selection: PhaseAssignment) =>
    expanded.includes(key) && (
      <TableRow>
        <TableCell
          colSpan={6}
          className="bg-muted/20 p-2 pl-5 whitespace-normal"
        >
          <PhaseTaskRows
            active={active}
            projectId={projectId}
            selection={selection}
            phases={allPhases}
            canUpdate={canUpdate && !planning.pendingDraft}
          />
        </TableCell>
      </TableRow>
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
      className={styles.workspace + " flex min-w-0 flex-col gap-3"}
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
      {phases.isSuccess && (
        <>
          <dl className="grid grid-cols-2 divide-x rounded-lg border bg-card py-3 sm:grid-cols-4">
            {[
              {
                label: "有効な工程",
                value: activePhases.length + "件",
                Icon: LayersIcon,
                tone: "info",
              },
              {
                label: "タスク",
                value: tasks ? tasks.length + "件" : "—",
                Icon: ClipboardListIcon,
                tone: "resolved",
              },
              {
                label: "見積工数",
                value: metric(tasks ?? [], "estimated"),
                Icon: TimerIcon,
                tone: "progress",
              },
              {
                label: "実績工数",
                value: metric(tasks ?? [], "actual"),
                Icon: Clock3Icon,
                tone: "success",
              },
            ].map(({ label, value, Icon, tone }) => (
              <div key={label} className="flex items-center gap-2 px-3">
                <Icon
                  className="size-5"
                  style={{ color: `var(--status-${tone}-chart)` }}
                />
                <div>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-semibold tabular-nums">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
          <div className={styles.split}>
            <div className={styles.gridArea + " min-w-0"}>
              <div
                role="region"
                tabIndex={0}
                aria-label="工程表をスクロール"
                data-gantt-scroll
                className="max-h-[68dvh] overflow-auto rounded-md border [&_[data-slot=table-container]]:overflow-visible"
              >
                <Table aria-label="工程と工数">
                  <TableHeader className="sticky top-0 z-10 bg-muted">
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
                      <TableHead
                        scope="col"
                        className="text-right"
                        title="完了件数 / 全タスク（中止を含む）"
                      >
                        完了 / 全件
                      </TableHead>
                      <TableHead scope="col">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiblePhases.map((phase, index) => {
                      const key = String(phase.id);
                      const members = groups.get(key) ?? [];
                      return (
                        <Fragment key={phase.id}>
                          <TableRow
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
                                        order.isPending ||
                                        nameEditor !== undefined
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
                                    aria-expanded={expanded.includes(key)}
                                    onClick={() => toggle(key)}
                                  >
                                    {expanded.includes(key) ? (
                                      <ChevronDownIcon />
                                    ) : (
                                      <ChevronRightIcon />
                                    )}
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
                              {metric(members, "estimated")}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {metric(members, "actual")}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {Boolean(phase.task_count) && (
                                <div className="ml-auto mb-1 h-1 w-14 rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full bg-[var(--status-info-chart)]"
                                    style={{
                                      width: `${(100 * (phase.completed_task_count ?? 0)) / phase.task_count!}%`,
                                    }}
                                  />
                                </div>
                              )}
                              {phase.completed_task_count === undefined
                                ? "—"
                                : `${phase.completed_task_count} / ${phase.task_count ?? 0}`}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon-xs"
                                  aria-label={phase.name + "の設定"}
                                  onClick={(e) => {
                                    detailsTrigger.current = e.currentTarget;
                                    setSelectedPhase({
                                      kind: "phase",
                                      phase_id: phase.id,
                                    });
                                  }}
                                >
                                  <Settings2Icon />
                                </Button>
                                {canManage && (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      disabled={
                                        nameEditor !== undefined ||
                                        order.isPending
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
                                        nameEditor !== undefined ||
                                        order.isPending
                                      }
                                      aria-label={`${phase.name}を${phase.archived_at ? "復元" : "アーカイブ"}`}
                                      onClick={(event) => {
                                        archiveTrigger.current =
                                          event.currentTarget;
                                        setArchiveTarget(phase);
                                      }}
                                    >
                                      {phase.archived_at
                                        ? "復元"
                                        : "アーカイブ"}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {taskRows(key, { kind: "phase", phase_id: phase.id })}
                        </Fragment>
                      );
                    })}
                    {nameEditor === null && (
                      <TableRow>
                        <TableCell colSpan={6}>{nameForm(null)}</TableCell>
                      </TableRow>
                    )}
                    {(
                      [
                        ["shared", "共通作業"],
                        ["unclassified", "未分類"],
                      ] as const
                    ).map(([key, label]) => {
                      const members = groups.get(key) ?? [];
                      return (
                        <Fragment key={key}>
                          <TableRow className="bg-muted/30">
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-expanded={expanded.includes(key)}
                                onClick={() => toggle(key)}
                              >
                                {expanded.includes(key) ? (
                                  <ChevronDownIcon />
                                ) : (
                                  <ChevronRightIcon />
                                )}
                                {label}
                              </Button>
                            </TableCell>
                            <TableCell className="text-right">
                              {tasks ? members.length : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {metric(members, "estimated")}
                            </TableCell>
                            <TableCell className="text-right">
                              {metric(members, "actual")}
                            </TableCell>
                            <TableCell className="text-right">
                              {members.length
                                ? members.filter((t) => t.status === "done")
                                    .length +
                                  " / " +
                                  members.length
                                : "—"}
                            </TableCell>
                            <TableCell />
                          </TableRow>
                          {taskRows(key, { kind: key })}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
            {selectedPhase && (
              <PhaseDetailPanel
                key={`${selectedPhase.kind}:${selectedPhase.phase_id ?? ""}`}
                projectId={projectId}
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

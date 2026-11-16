"use client";

import { useRef, useState } from "react";
import { FolderPlusIcon, PlusIcon } from "lucide-react";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { Button } from "@/components/ui/button";
import type { PhaseRead, TaskRead } from "@/lib/api/generated/model";

import type { usePlanningPhases } from "../../hooks/use-planning-phases";
import type { TaskPlanningController } from "../../hooks/use-task-planning";
import { getPlanningPhaseKey } from "../../lib/planning-phases";
import { PlanningPlacementDialog } from "./planning-placement-dialog";
import { PhaseEditor } from "./task-phase-dialog";

export function PlanningPhaseActions({
  projectId,
  phases,
  tasks,
  canManage,
  canUpdate,
  planning,
}: {
  projectId: number;
  phases: ReturnType<typeof usePlanningPhases>;
  tasks: TaskRead[] | undefined;
  canManage: boolean;
  canUpdate: boolean;
  planning: TaskPlanningController;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [placementOpen, setPlacementOpen] = useState(false);
  const [newPhaseId, setNewPhaseId] = useState<number>();
  const [result, setResult] = useState<{ message: string; task?: TaskRead }>();
  const createTrigger = useRef<HTMLButtonElement>(null);
  const placementTrigger = useRef<HTMLButtonElement>(null);
  const placedTask = result?.task;
  const activePhases = phases.data?.filter((phase) => !phase.archived_at) ?? [];
  const canPlace =
    canUpdate &&
    !phases.isError &&
    activePhases.length > 0 &&
    Boolean(tasks?.length);

  const phaseCreated = (phase: PhaseRead) => {
    setNewPhaseId(phase.id);
    setResult({ message: `工程「${phase.name}」を追加しました。` });
  };

  return (
    <section
      aria-label="工程と配置"
      className="flex min-w-0 flex-col gap-2 rounded-lg border p-3"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="text-sm font-medium">工程と配置</h2>
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
            {tasks
              ? ` · 未分類 ${tasks.filter((task) => getPlanningPhaseKey(task) === "unclassified").length}件`
              : ""}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <Button
              ref={createTrigger}
              type="button"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <PlusIcon data-icon="inline-start" />
              {phases.data?.length === 0 ? "最初の工程を追加" : "工程を追加"}
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
              工程に配置
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
      {createOpen ? (
        <PhaseEditor
          projectId={projectId}
          phase={null}
          action="edit"
          onCreated={phaseCreated}
          onClose={() => setCreateOpen(false)}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            createTrigger.current?.focus();
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
          onSaved={(task, phase) => {
            setResult({
              message: `「${task.title}」を工程「${phase.name}」に配置しました。`,
              task,
            });
            setNewPhaseId(phase.id);
            setPlacementOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}

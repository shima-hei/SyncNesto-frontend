"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { FormApiError } from "@/components/shared/forms/form-api-error";
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
import { ApiError } from "@/lib/api/error";
import type {
  GanttResponse,
  PhaseAssignment,
  PhaseRead,
  TaskRead,
} from "@/lib/api/generated/model";
import {
  getReadGanttProjectsProjectIdGanttGetQueryKey,
  readTaskTasksTaskIdGet,
  updateTaskTasksTaskIdPatch,
} from "@/lib/api/generated/tasks/tasks";

import type { TaskPlanningController } from "../../hooks/use-task-planning";
import {
  getPlanningPhaseKey,
  getPlanningPhaseLabels,
} from "../../lib/planning-phases";
import {
  invalidateTaskProjectSurfaces,
  setTaskDetailCache,
} from "../../lib/task-cache";

const selectClass =
  "h-9 min-w-0 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring";
type Destination = { key: string; label: string; assignment: PhaseAssignment };
type Attempt = { task: TaskRead; destination: Destination; uncertain: boolean };

export function PlanningPlacementDialog({
  projectId,
  phases,
  initialPhaseId,
  tasks,
  planning,
  canUpdate,
  onClose,
  onCloseAutoFocus,
  onSaved,
}: {
  projectId: number;
  phases: PhaseRead[];
  initialPhaseId?: number;
  tasks: TaskRead[];
  planning: TaskPlanningController;
  canUpdate: boolean;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
  onSaved: (task: TaskRead, destination: Destination) => void;
}) {
  const client = useQueryClient();
  const [destinationKey, setDestinationKey] = useState(
    initialPhaseId ? `phase:${initialPhaseId}` : "",
  );
  const [taskId, setTaskId] = useState("");
  const [search, setSearch] = useState("");
  const [onlyUnclassified, setOnlyUnclassified] = useState(false);
  const [working, setWorking] = useState(false);
  const [attempt, setAttempt] = useState<Attempt>();
  const [reviewedTask, setReviewedTask] = useState<TaskRead>();
  const [error, setError] = useState<Error | null>(null);
  const labels = getPlanningPhaseLabels(phases);
  const needle = search.trim().toLocaleLowerCase();
  const candidates = tasks.filter(
    (task) =>
      (!onlyUnclassified || getPlanningPhaseKey(task) === "unclassified") &&
      (!needle ||
        `${task.task_code ?? ""} ${task.title}`
          .toLocaleLowerCase()
          .includes(needle)),
  );
  const candidate = candidates.find((task) => String(task.id) === taskId);
  const task =
    candidate &&
    reviewedTask?.id === candidate.id &&
    reviewedTask.version >= candidate.version
      ? reviewedTask
      : candidate;
  const phaseDestinations = phases
    .filter((phase) => !phase.archived_at)
    .map((phase): Destination => ({
      key: `phase:${phase.id}`,
      label: phase.name,
      assignment: { kind: "phase", phase_id: phase.id },
    }));
  const otherDestinations: Destination[] = [
    { key: "shared", label: "共通作業", assignment: { kind: "shared" } },
    {
      key: "unclassified",
      label: "未分類",
      assignment: { kind: "unclassified" },
    },
  ];
  const destination = [...phaseDestinations, ...otherDestinations].find(
    ({ key }) => key === destinationKey,
  );
  const unchanged = task && getPlanningPhaseKey(task) === destinationKey;
  const hasDraft = Boolean(
    planning.pendingDraft || (task && planning.rows[task.id]),
  );

  const publish = (saved: TaskRead) => {
    setTaskDetailCache(client, saved.id, saved);
    client.setQueriesData<GanttResponse>(
      { queryKey: getReadGanttProjectsProjectIdGanttGetQueryKey(projectId) },
      (gantt) =>
        gantt && {
          ...gantt,
          tasks: gantt.tasks.map((row) =>
            row.id === saved.id && row.version <= saved.version ? saved : row,
          ),
        },
    );
    void invalidateTaskProjectSurfaces(client, projectId);
  };

  const save = async () => {
    if (
      !canUpdate ||
      !task ||
      !destination ||
      hasDraft ||
      working ||
      attempt ||
      unchanged
    )
      return;
    setWorking(true);
    setError(null);
    try {
      const saved = await updateTaskTasksTaskIdPatch(task.id, {
        version: task.version,
        phase_assignment: destination.assignment,
      });
      publish(saved);
      onSaved(saved, destination);
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        error.status >= 500 ||
        error.status === 409
      ) {
        setAttempt({
          task,
          destination,
          uncertain: !(error instanceof ApiError && error.status === 409),
        });
      } else {
        setError(error);
        void invalidateTaskProjectSurfaces(client, projectId);
      }
    } finally {
      setWorking(false);
    }
  };

  const checkCurrent = async () => {
    if (!attempt || working) return;
    setWorking(true);
    setError(null);
    try {
      const current = await readTaskTasksTaskIdGet(attempt.task.id);
      // 再取得した版で所属を確認し、次の保存は利用者が選ぶ。
      if (current.project_id !== projectId)
        throw new Error("所属を確認できませんでした。");
      setTaskDetailCache(client, current.id, current);
      void invalidateTaskProjectSurfaces(client, projectId);
      if (getPlanningPhaseKey(current) === attempt.destination.key) {
        onSaved(current, attempt.destination);
      } else {
        setReviewedTask(current);
        setAttempt(undefined);
      }
    } catch (error) {
      setError(error as Error);
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !working && onClose()}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>タスクの所属を変更</DialogTitle>
          <DialogDescription>
            タスクを検索し、移動先の工程を選択します。
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="placement-search">
                タスク名・コードで検索
              </FieldLabel>
              <Input
                id="placement-search"
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setTaskId("");
                }}
                disabled={working || Boolean(attempt)}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onlyUnclassified}
                  onChange={(event) => {
                    setOnlyUnclassified(event.target.checked);
                    setTaskId("");
                  }}
                  disabled={working || Boolean(attempt)}
                />
                未分類のみ
              </label>
            </Field>
            <Field>
              <FieldLabel htmlFor="placement-task">タスク</FieldLabel>
              <select
                id="placement-task"
                required
                className={selectClass}
                value={task?.id ?? ""}
                onChange={(event) => {
                  setTaskId(event.target.value);
                  setError(null);
                }}
                disabled={working || Boolean(attempt)}
              >
                <option value="">
                  {candidates.length
                    ? "タスクを選択"
                    : "条件に合うタスクがありません"}
                </option>
                {candidates.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.task_code} {task.title}
                  </option>
                ))}
              </select>
              {task ? (
                <p role="status" className="text-sm text-muted-foreground">
                  現在の所属{" "}
                  {labels.get(getPlanningPhaseKey(task)) ??
                    `工程 #${task.phase_id}`}
                  {!task.start_date && !task.due_date ? " · 未日程" : ""}
                </p>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="placement-phase">変更先の所属</FieldLabel>
              <select
                id="placement-phase"
                required
                className={selectClass}
                value={destination?.key ?? ""}
                onChange={(event) => {
                  setDestinationKey(event.target.value);
                  setError(null);
                }}
                disabled={working || Boolean(attempt)}
              >
                <option value="">所属先を選択</option>
                {phaseDestinations.length ? (
                  <optgroup label="工程">
                    {phaseDestinations.map(({ key, label }) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                <optgroup label="工程外">
                  {otherDestinations.map(({ key, label }) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </Field>
            {hasDraft ? (
              <p role="status" className="text-sm">
                このタスクの計画下書きを先に保存するか、取り消してください。
              </p>
            ) : null}
            {attempt ? (
              <>
                <p role="alert" className="text-sm">
                  {attempt.uncertain
                    ? "配置の保存結果が不明です。現在の所属を確認してください。"
                    : "別の更新があります。現在の所属を確認してください。"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={working}
                  onClick={() => void checkCurrent()}
                >
                  現在の所属を確認
                </Button>
              </>
            ) : (
              <Button
                type="submit"
                disabled={
                  !canUpdate ||
                  !task ||
                  !destination ||
                  hasDraft ||
                  working ||
                  unchanged
                }
              >
                {working ? "配置中…" : "配置を保存"}
              </Button>
            )}
            <FormApiError error={error} />
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

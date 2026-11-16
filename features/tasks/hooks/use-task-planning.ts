"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/providers/auth-provider";
import { getConflictCurrent } from "@/lib/api/conflict";
import { ApiError } from "@/lib/api/error";
import type { TaskRead } from "@/lib/api/generated/model";
import {
  readTaskTasksTaskIdGet,
  updateTaskPlanningTasksTaskIdPlanningPatch,
  updateTaskTasksTaskIdPatch,
} from "@/lib/api/generated/tasks/tasks";
import { getDraftSession, isCurrentDraftSession } from "@/lib/demo/session";
import {
  readStoredDraft,
  removeStoredDraft,
  writeStoredDraft,
} from "@/lib/draft/draft-storage";

import {
  invalidateTaskProjectSurfaces,
  setTaskDetailCache,
} from "../lib/task-cache";
import {
  getPlanningDraftScope,
  getPlanningValidation,
  getProgressValidation,
  getTaskPlanningValues,
  isPlanningDirty,
  isPlanningReflected,
  readPlanningDrafts,
  rebaseAfterPlanningSave,
  toTaskProgressUpdate,
  toTaskPlanningUpdate,
  type TaskPlanningDraft,
  type TaskPlanningValues,
} from "../lib/task-planning";

export type PlanningRow = TaskPlanningDraft & {
  status: "draft" | "pending" | "error" | "conflict" | "unknown";
  message?: string;
  planningSaved?: boolean;
  undoDates?: Pick<TaskRead, "actual_start_date" | "actual_end_date">;
};
type UndoAction = { id: string | number; run: () => void };

const EMPTY_ROWS: Record<number, PlanningRow> = {};

export function useTaskPlanning(projectId: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const session = user ? getDraftSession(user.id) : null;
  const scope = getPlanningDraftScope(projectId);
  const key = `${session}:${scope}`;
  const [state, setState] = useState({
    key,
    rows: {} as Record<number, PlanningRow>,
    handled: false,
  });
  const [storageError, setStorageError] = useState(false);
  const [comparison, setComparison] = useState<{
    draft: PlanningRow;
    current: TaskRead;
  } | null>(null);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [editorTask, setEditorTask] = useState<TaskRead | null>(null);
  const editorTrigger = useRef<HTMLElement | null>(null);
  const [lastSaved, setLastSaved] = useState<{
    task: TaskRead;
    revision: number;
  } | null>(null);
  const undoAction = useRef<UndoAction | null>(null);
  const rowsRef = useRef(state.rows);
  const inFlight = useRef(new Set<number>());
  const activeKey = useRef(key);
  if (state.key !== key) {
    setState({ key, rows: {}, handled: false });
    setComparison(null);
    setEditorTask(null);
    setLastSaved(null);
    setStorageError(false);
  }
  const rows = state.key === key ? state.rows : EMPTY_ROWS;
  useLayoutEffect(() => {
    activeKey.current = key;
    rowsRef.current = rows;
  }, [key, rows]);
  useEffect(() => {
    const handleUndo = (event: KeyboardEvent) => {
      if (
        !undoAction.current ||
        event.isComposing ||
        event.repeat ||
        !(event.ctrlKey || event.metaKey) ||
        event.altKey ||
        event.shiftKey ||
        event.key.toLowerCase() !== "z"
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      undoAction.current.run();
    };
    document.addEventListener("keydown", handleUndo, true);
    return () => {
      document.removeEventListener("keydown", handleUndo, true);
      if (undoAction.current) toast.dismiss(undoAction.current.id);
      undoAction.current = null;
    };
  }, [key]);
  const stored = useMemo(() => {
    try {
      return readStoredDraft<
        Record<
          number,
          TaskPlanningDraft & {
            uncertain?: boolean;
            planningSaved?: boolean;
            undoDates?: PlanningRow["undoDates"];
          }
        >
      >(user?.id, scope, 1, session);
    } catch {
      return null;
    }
  }, [scope, session, user?.id]);
  const pendingDraft = !state.handled && stored ? stored : null;
  const isActive = () =>
    Boolean(
      user &&
      activeKey.current === key &&
      isCurrentDraftSession(user.id, session),
    );
  const persistRows = (next: Record<number, PlanningRow>) => {
    if (!isActive()) return;
    rowsRef.current = next;
    setState({ key, rows: next, handled: true });
    try {
      const saved = Object.fromEntries(
        Object.entries(next).map(([id, row]) => [
          id,
          {
            baseline: row.baseline,
            values: row.values,
            uncertain: row.status === "pending" || row.status === "unknown",
            planningSaved: row.planningSaved,
            undoDates: row.undoDates,
          },
        ]),
      );
      if (Object.keys(saved).length)
        writeStoredDraft(user?.id, scope, saved, 1, session);
      else removeStoredDraft(user?.id, scope, session);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  };
  const discard = (taskId: number) => {
    if (inFlight.current.has(taskId)) return;
    const next = { ...rowsRef.current };
    delete next[taskId];
    persistRows(next);
  };
  const edit = (task: TaskRead, changes: Partial<TaskPlanningValues>) => {
    if (pendingDraft || inFlight.current.has(task.id)) return;
    const previous = rowsRef.current[task.id];
    if (previous?.status === "unknown" || previous?.status === "conflict")
      return;
    const values = previous?.values ?? getTaskPlanningValues(task);
    if (
      Object.entries(changes).every(
        ([key, value]) => values[key as keyof TaskPlanningValues] === value,
      )
    )
      return;
    const row: PlanningRow = {
      baseline: previous?.baseline ?? task,
      values: {
        ...values,
        ...changes,
      },
      status: "draft",
      planningSaved: previous?.planningSaved,
      undoDates: previous?.undoDates,
    };
    const next = { ...rowsRef.current, [task.id]: row };
    if (!isPlanningDirty(row)) delete next[task.id];
    persistRows(next);
  };
  const confirm = async (taskId: number) => {
    const row = rowsRef.current[taskId];
    if (!row || inFlight.current.has(taskId)) return;
    setCheckingId(taskId);
    inFlight.current.add(taskId);
    try {
      const current = await readTaskTasksTaskIdGet(taskId);
      if (!isActive()) return;
      if (current.project_id !== projectId)
        throw new Error("確認対象のプロジェクトが異なります。");
      setTaskDetailCache(queryClient, taskId, current);
      if (row.status === "unknown" && isPlanningReflected(row, current)) {
        const next = { ...rowsRef.current };
        delete next[taskId];
        persistRows(next);
        void invalidateTaskProjectSurfaces(queryClient, projectId);
      } else setComparison({ draft: row, current });
    } catch {
      if (isActive())
        persistRows({
          ...rowsRef.current,
          [taskId]: {
            ...row,
            message:
              "現在値を取得できませんでした。入力を保持しています。再度確認してください。",
          },
        });
    } finally {
      inFlight.current.delete(taskId);
      if (isActive()) setCheckingId(null);
    }
  };
  const save = async (task: TaskRead) => {
    const row = rowsRef.current[task.id];
    if (
      !isActive() ||
      !row ||
      inFlight.current.has(task.id) ||
      row.status === "unknown" ||
      row.status === "conflict"
    )
      return;
    const dateChanged =
      row.values.startDate !== (row.baseline.start_date ?? "") ||
      row.values.dueDate !== (row.baseline.due_date ?? "");
    const validation =
      getPlanningValidation(row.values, dateChanged) ??
      getProgressValidation(row);
    if (validation) {
      persistRows({
        ...rowsRef.current,
        [task.id]: { ...row, status: "error", message: validation },
      });
      toast.error(validation);
      return;
    }
    if (task.version > row.baseline.version) {
      void confirm(task.id);
      return;
    }
    inFlight.current.add(task.id);
    persistRows({
      ...rowsRef.current,
      [task.id]: { ...row, status: "pending", message: undefined },
    });
    let pending: PlanningRow = row;
    let saved = row.baseline;
    try {
      const plan = toTaskPlanningUpdate(row);
      if (Object.keys(plan).length > 1) {
        saved = await updateTaskPlanningTasksTaskIdPlanningPatch(task.id, plan);
        if (!isActive()) return;
        pending = {
          ...rebaseAfterPlanningSave(row, saved),
          status: "pending",
          planningSaved: true,
          undoDates: row.undoDates,
        };
        setTaskDetailCache(queryClient, saved.id, saved);
        persistRows({ ...rowsRef.current, [task.id]: pending });
      }
      const progress = toTaskProgressUpdate(pending);
      if (progress)
        saved = await updateTaskTasksTaskIdPatch(task.id, {
          ...progress,
          ...pending.undoDates,
        });
      if (!isActive()) return;
      setTaskDetailCache(queryClient, saved.id, saved);
      const next = { ...rowsRef.current };
      delete next[saved.id];
      persistRows(next);
      setLastSaved((previous) => ({
        task: saved,
        revision: (previous?.revision ?? 0) + 1,
      }));
      if (row.undoDates)
        toast.success(`「${saved.title}」の変更を元に戻しました。`);
      else notifySaved(row.baseline, saved);
      // 保存成功を、後続の再取得失敗で取り消さない。
      void invalidateTaskProjectSurfaces(queryClient, projectId);
    } catch (error) {
      if (!isActive()) return;
      const current = getConflictCurrent<TaskRead>(error);
      const knownFailure = error instanceof ApiError && error.status < 500;
      if (current && row.undoDates && !pending.planningSaved) {
        const next = { ...rowsRef.current };
        delete next[task.id];
        persistRows(next);
        void invalidateTaskProjectSurfaces(queryClient, projectId);
        toast.error("別の更新があるため、元に戻せませんでした。");
        return;
      }
      const message = current
        ? "他の更新があります。現在値と入力を比較してください。"
        : knownFailure
          ? error.message
          : "保存結果が不明です。自動再送せず、現在値を確認してください。";
      const failed: PlanningRow = {
        ...pending,
        status: current ? "conflict" : knownFailure ? "error" : "unknown",
        message: pending.planningSaved
          ? `担当・日程などの計画項目は保存済みです。進捗の更新について ${message}`
          : message,
      };
      persistRows({ ...rowsRef.current, [task.id]: failed });
      if (pending.planningSaved)
        void invalidateTaskProjectSurfaces(queryClient, projectId);
      if (current) setComparison({ draft: failed, current });
      toast.error(failed.message);
    } finally {
      inFlight.current.delete(task.id);
    }
  };
  const notifySaved = (before: TaskRead, saved: TaskRead) => {
    if (undoAction.current) toast.dismiss(undoAction.current.id);
    const clear = ({ id }: { id: string | number }) => {
      if (undoAction.current?.id === id) undoAction.current = null;
    };
    const run = () => {
      if (!undoAction.current || undoAction.current.id !== id) return;
      undoAction.current = null;
      toast.dismiss(id);
      if (
        !isActive() ||
        rowsRef.current[saved.id] ||
        inFlight.current.has(saved.id)
      ) {
        toast.error("編集中の変更を確認してから操作してください。");
        return;
      }
      const oldValues = getTaskPlanningValues(before);
      const inverse: PlanningRow = {
        baseline: saved,
        values: { ...oldValues, changeReason: "ガントで直前の変更を取り消し" },
        status: "draft",
        undoDates: {
          ...(before.actual_start_date !== saved.actual_start_date
            ? { actual_start_date: before.actual_start_date ?? null }
            : {}),
          ...(before.actual_end_date !== saved.actual_end_date
            ? { actual_end_date: before.actual_end_date ?? null }
            : {}),
        },
      };
      persistRows({ ...rowsRef.current, [saved.id]: inverse });
      void save(saved);
    };
    const id = toast.success(`「${saved.title}」を変更しました。`, {
      position: "bottom-center",
      duration: 10000,
      closeButton: true,
      description: "Ctrl+Z / ⌘Z",
      action: { label: "元に戻す", onClick: run },
      onAutoClose: clear,
      onDismiss: clear,
    });
    undoAction.current = { id, run };
  };

  const commit = async (
    task: TaskRead,
    changes: Partial<TaskPlanningValues>,
  ) => {
    const previous = rowsRef.current[task.id];
    edit(task, changes);
    if (rowsRef.current[task.id] === previous) return;
    if (previous && previous.status !== "error" && rowsRef.current[task.id]) {
      toast.info("下書きを更新しました。「編集中の計画」から保存できます。");
      return;
    }
    await save(task);
  };

  return {
    projectId,
    rows,
    edit,
    commit,
    save,
    discard,
    confirm,
    checkingId,
    pendingDraft,
    storageError,
    comparison,
    editorTask,
    lastSaved,
    openEditor: (task: TaskRead, trigger: HTMLElement) => {
      editorTrigger.current = trigger;
      setEditorTask(task);
    },
    restoreEditorFocus: () => {
      const trigger = editorTrigger.current;
      editorTrigger.current = null;
      if (!trigger?.isConnected) return false;
      trigger.focus({ preventScroll: true });
      return document.activeElement === trigger;
    },
    closeEditor: () => setEditorTask(null),
    closeComparison: () => setComparison(null),
    resolveComparison: (values: TaskPlanningValues) => {
      if (!comparison) return;
      const row: PlanningRow = {
        baseline: comparison.current,
        values,
        status: "draft",
        undoDates: comparison.draft.undoDates,
      };
      const next = { ...rowsRef.current, [row.baseline.id]: row };
      if (!isPlanningDirty(row)) delete next[row.baseline.id];
      persistRows(next);
      setComparison(null);
    },
    restore: () => {
      const valid = readPlanningDrafts(stored?.values, projectId);
      persistRows(
        Object.fromEntries(
          Object.entries(valid).map(([id, draft]) => [
            id,
            {
              ...draft,
              planningSaved: stored?.values[Number(id)]?.planningSaved,
              undoDates: stored?.values[Number(id)]?.undoDates,
              status: stored?.values[Number(id)]?.uncertain
                ? "unknown"
                : "draft",
            },
          ]),
        ),
      );
    },
    discardStored: () => persistRows({}),
  };
}

export type TaskPlanningController = ReturnType<typeof useTaskPlanning>;

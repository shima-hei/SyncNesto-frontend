"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/providers/auth-provider";
import { getConflictCurrent } from "@/lib/api/conflict";
import { ApiError } from "@/lib/api/error";
import type { TaskRead } from "@/lib/api/generated/model";
import {
  readTaskTasksTaskIdGet,
  updateTaskPlanningTasksTaskIdPlanningPatch,
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
  getTaskPlanningValues,
  isPlanningDirty,
  isPlanningReflected,
  readPlanningDrafts,
  toTaskPlanningUpdate,
  type TaskPlanningDraft,
  type TaskPlanningValues,
} from "../lib/task-planning";

export type PlanningRow = TaskPlanningDraft & {
  status: "draft" | "pending" | "error" | "conflict" | "unknown";
  message?: string;
};
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
  const rowsRef = useRef(state.rows);
  const inFlight = useRef(new Set<number>());
  const activeKey = useRef(key);
  if (state.key !== key) {
    setState({ key, rows: {}, handled: false });
    setComparison(null);
    setEditorTask(null);
    setStorageError(false);
  }
  const rows = state.key === key ? state.rows : EMPTY_ROWS;
  useLayoutEffect(() => {
    activeKey.current = key;
    rowsRef.current = rows;
  }, [key, rows]);
  const stored = useMemo(() => {
    try {
      return readStoredDraft<
        Record<number, TaskPlanningDraft & { uncertain?: boolean }>
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
    if (previous?.status === "unknown") return;
    const row: PlanningRow = {
      baseline: previous?.baseline ?? task,
      values: {
        ...(previous?.values ?? getTaskPlanningValues(task)),
        ...changes,
      },
      status: "draft",
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
    const validation = getPlanningValidation(row.values, dateChanged);
    if (validation) {
      persistRows({
        ...rowsRef.current,
        [task.id]: { ...row, status: "error", message: validation },
      });
      return;
    }
    if (task.version !== row.baseline.version) {
      setComparison({ draft: row, current: task });
      return;
    }
    inFlight.current.add(task.id);
    persistRows({
      ...rowsRef.current,
      [task.id]: { ...row, status: "pending", message: undefined },
    });
    try {
      const saved = await updateTaskPlanningTasksTaskIdPlanningPatch(
        task.id,
        toTaskPlanningUpdate(row),
      );
      if (!isActive()) return;
      setTaskDetailCache(queryClient, saved.id, saved);
      const next = { ...rowsRef.current };
      delete next[saved.id];
      persistRows(next);
      // 保存成功を、後続の再取得失敗で取り消さない。
      void invalidateTaskProjectSurfaces(queryClient, projectId);
    } catch (error) {
      if (!isActive()) return;
      const current = getConflictCurrent<TaskRead>(error);
      const knownFailure = error instanceof ApiError && error.status < 500;
      persistRows({
        ...rowsRef.current,
        [task.id]: {
          ...row,
          status: current ? "conflict" : knownFailure ? "error" : "unknown",
          message: current
            ? "他の更新があります。現在値と入力を比較してください。"
            : knownFailure
              ? error.message
              : "保存結果が不明です。自動再送せず、現在値を確認してください。",
        },
      });
      if (current) setComparison({ draft: row, current });
    } finally {
      inFlight.current.delete(task.id);
    }
  };
  return {
    projectId,
    rows,
    edit,
    save,
    discard,
    confirm,
    checkingId,
    pendingDraft,
    storageError,
    comparison,
    editorTask,
    openEditor: setEditorTask,
    closeEditor: () => setEditorTask(null),
    closeComparison: () => setComparison(null),
    resolveComparison: (values: TaskPlanningValues) => {
      if (!comparison) return;
      const row: PlanningRow = {
        baseline: comparison.current,
        values,
        status: "draft",
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

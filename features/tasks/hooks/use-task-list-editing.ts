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
  invalidateTaskChangeLogs,
  invalidateTaskProjectSurfaces,
  setTaskDetailCache,
} from "../lib/task-cache";
import {
  getListEditValues,
  isListEditReflected,
  listEditChanges,
  readListEditDrafts,
  rebaseListEdit,
  toListEditMutation,
  validateListEdit,
  type ListEditDraft,
  type ListEditValues,
} from "../lib/task-list-edit";

export type ListEditRow = ListEditDraft & {
  status: "draft" | "pending" | "error" | "unknown" | "conflict";
  message?: string;
};
const EMPTY_ROWS: Record<number, ListEditRow> = {};
export function useTaskListEditing(projectId: number, activeId: number | null) {
  const { user } = useAuth();
  const client = useQueryClient();
  const session = user ? getDraftSession(user.id) : null;
  const scope = `project:${projectId}:task-list-edit`;
  const key = `${session}:${scope}`;
  const [state, setState] = useState({ key, rows: EMPTY_ROWS, handled: false });
  const [storageError, setStorageError] = useState(false);
  const [comparison, setComparison] = useState<{
    draft: ListEditRow;
    current: TaskRead;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const rowsRef = useRef(state.rows);
  const activeKey = useRef(key);
  const inFlight = useRef(new Set<number>());
  if (state.key !== key) {
    setState({ key, rows: EMPTY_ROWS, handled: false });
    setComparison(null);
    setPendingAction(null);
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
        Record<number, ListEditDraft & { uncertain?: boolean }>
      >(user?.id, scope, 1, session);
    } catch {
      return null;
    }
  }, [scope, session, user?.id]);
  const pendingDraft =
    !state.handled &&
    stored &&
    Object.keys(readListEditDrafts(stored.values, projectId)).length > 0
      ? stored
      : null;
  const isActive = () =>
    Boolean(
      user &&
      activeKey.current === key &&
      isCurrentDraftSession(user.id, session),
    );
  const persist = (next: Record<number, ListEditRow>) => {
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
  const discard = (id: number) => {
    if (inFlight.current.has(id)) return;
    const next = { ...rowsRef.current };
    delete next[id];
    persist(next);
  };
  const edit = (task: TaskRead, changes: Partial<ListEditValues>) => {
    if (
      pendingDraft ||
      inFlight.current.has(task.id) ||
      ["unknown", "conflict"].includes(rowsRef.current[task.id]?.status)
    )
      return;
    const old = rowsRef.current[task.id];
    const row: ListEditRow = {
      baseline: old?.baseline ?? task,
      values: { ...(old?.values ?? getListEditValues(task)), ...changes },
      status: "draft",
    };
    if (listEditChanges(row).length)
      persist({ ...rowsRef.current, [task.id]: row });
    else discard(task.id);
  };
  const confirm = async (id: number) => {
    const row = rowsRef.current[id];
    if (!row || inFlight.current.has(id)) return;
    inFlight.current.add(id);
    setChecking(true);
    try {
      const current = await readTaskTasksTaskIdGet(id);
      if (!isActive()) return;
      if (current.id !== id || current.project_id !== projectId)
        throw new Error("確認対象が異なります。");
      setTaskDetailCache(client, id, current);
      if (row.status === "unknown" && isListEditReflected(row, current)) {
        const next = { ...rowsRef.current };
        delete next[id];
        persist(next);
        toast.info("入力した値は現在のタスクに反映されています。");
        void invalidateTaskProjectSurfaces(client, projectId);
      } else setComparison({ draft: row, current });
    } catch {
      if (isActive())
        persist({
          ...rowsRef.current,
          [id]: {
            ...row,
            message: "最新値を確認できませんでした。入力を保持しています。",
          },
        });
    } finally {
      inFlight.current.delete(id);
      if (isActive()) setChecking(false);
    }
  };
  const save = async (task: TaskRead, override?: ListEditRow) => {
    const row = override ?? rowsRef.current[task.id];
    if (
      !isActive() ||
      pendingDraft ||
      !row ||
      inFlight.current.has(task.id) ||
      ["unknown", "conflict"].includes(row.status)
    )
      return;
    if (!listEditChanges(row).length) {
      discard(task.id);
      return;
    }
    const validation = validateListEdit(row);
    if (validation) {
      persist({
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
    persist({ ...rowsRef.current, [task.id]: { ...row, status: "pending" } });
    try {
      const mutation = toListEditMutation(row);
      const saved =
        mutation.contract === "planning"
          ? await updateTaskPlanningTasksTaskIdPlanningPatch(
              task.id,
              mutation.data,
            )
          : await updateTaskTasksTaskIdPatch(task.id, mutation.data);
      if (!isActive()) return;
      setTaskDetailCache(client, saved.id, saved);
      const next = { ...rowsRef.current };
      delete next[saved.id];
      persist(next);
      setComparison(null);
      toast.success("タスクを更新しました。");
      void invalidateTaskProjectSurfaces(client, projectId);
      void invalidateTaskChangeLogs(client, saved.id);
    } catch (error) {
      if (!isActive()) return;
      const candidate = getConflictCurrent<TaskRead>(error);
      const current =
        candidate?.id === task.id &&
        candidate?.project_id === projectId &&
        Number.isInteger(candidate.version)
          ? candidate
          : null;
      const known =
        error instanceof ApiError && error.status >= 400 && error.status < 500;
      const next: ListEditRow = {
        ...row,
        status: current ? "conflict" : known ? "error" : "unknown",
        message: current
          ? "他の更新があります。元の値・最新・入力を比較してください。"
          : known
            ? error.message
            : "保存結果が不明です。自動で再送せず、最新の値を確認してください。",
      };
      persist({ ...rowsRef.current, [task.id]: next });
      if (current) setComparison({ draft: next, current });
    } finally {
      inFlight.current.delete(task.id);
    }
  };
  const hasDirty = Object.values(rows).some(
    (row) => listEditChanges(row).length > 0,
  );
  useEffect(() => {
    if (!hasDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasDirty]);
  return {
    rows,
    pendingDraft,
    storageError,
    comparison,
    checking,
    pendingAction,
    edit,
    save,
    confirm,
    discard,
    guard: (action: () => void) => {
      if (activeId && inFlight.current.has(activeId)) {
        toast.info("保存結果を確認しています。");
        return;
      }
      if (
        activeId &&
        rowsRef.current[activeId] &&
        listEditChanges(rowsRef.current[activeId]).length
      )
        setPendingAction(() => action);
      else action();
    },
    cancelNavigation: () => setPendingAction(null),
    discardAndNavigate: () => {
      if (activeId) discard(activeId);
      const action = pendingAction;
      setPendingAction(null);
      action?.();
    },
    restore: () =>
      persist(
        Object.fromEntries(
          Object.entries(readListEditDrafts(stored?.values, projectId)).map(
            ([id, row]) => [
              id,
              { ...row, status: row.uncertain ? "unknown" : "draft" },
            ],
          ),
        ),
      ),
    discardStored: () => persist({}),
    closeComparison: () => setComparison(null),
    useCurrent: () => {
      if (comparison) {
        setTaskDetailCache(client, comparison.current.id, comparison.current);
        discard(comparison.current.id);
        setComparison(null);
      }
    },
    reapply: async () => {
      if (!comparison) return;
      const { draft, current } = comparison;
      const row: ListEditRow = {
        ...rebaseListEdit(draft, current),
        status: "draft",
      };
      persist({ ...rowsRef.current, [current.id]: row });
      setComparison(null);
      await save(current, row);
    },
  };
}
export type TaskListEditingController = ReturnType<typeof useTaskListEditing>;

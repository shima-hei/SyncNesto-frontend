"use client";

import { useState } from "react";

import { useAuth } from "@/features/auth/providers/auth-provider";
import { useFormDraft } from "@/hooks/use-form-draft";
import { getConflictFields } from "@/lib/api/conflict";
import { writeStoredDraft } from "@/lib/draft/draft-storage";

import {
  getTaskFormDraftScope,
  hasUnreflectedTaskFormDraft,
  mergeTaskFormDraft,
  type TaskFormDraft,
} from "../lib/task-form-draft";
import type { TaskFormValues } from "../types/task-form";

export function useTaskFormDraft({
  projectId,
  mode,
  currentTaskId,
  section,
  initialValues,
  values,
  onRestore,
  draftScope,
}: {
  projectId: number;
  mode: "create" | "update";
  currentTaskId?: number;
  section?: string;
  initialValues: TaskFormValues;
  values: TaskFormValues;
  onRestore: (values: TaskFormValues) => void;
  draftScope?: string;
}) {
  const { user } = useAuth();
  const [restoreConflict, setRestoreConflict] = useState<TaskFormDraft | null>(
    null,
  );
  const [storageError, setStorageError] = useState(false);
  const baseScope = getTaskFormDraftScope(
    projectId,
    mode,
    initialValues,
    currentTaskId,
  );
  const scope = draftScope ?? (section ? baseScope + ":" + section : baseScope);
  const draft = useFormDraft({
    userId: storageError ? null : user?.id,
    scope,
    values: { values, initialValues },
    initialValues: { values: initialValues, initialValues },
    onRestore: (saved: TaskFormDraft) => {
      const fields = getConflictFields({
        original: saved.initialValues,
        local: saved.values,
        current: initialValues,
      });
      if (fields.length) setRestoreConflict(saved);
      else onRestore(mergeTaskFormDraft(saved, initialValues));
    },
  });
  const persist = (next: TaskFormValues) => {
    try {
      writeStoredDraft(user?.id, scope, { values: next, initialValues });
    } catch {
      setStorageError(true);
    }
  };

  return {
    ...draft,
    clearDraft: () => {
      try {
        draft.clearDraft();
      } catch {
        setStorageError(true);
      }
    },
    // 保存応答のversion更新で再マウントしても、反映済みの入力は復元しない。
    pendingDraft:
      draft.pendingDraft &&
      hasUnreflectedTaskFormDraft(draft.pendingDraft.values, initialValues)
        ? draft.pendingDraft
        : null,
    persist,
    storageError,
    restoreConflict,
    closeRestoreConflict: () => setRestoreConflict(null),
    restoredValues: restoreConflict
      ? mergeTaskFormDraft(restoreConflict, initialValues)
      : null,
    resolveRestore: (next: TaskFormValues) => {
      onRestore(next);
      persist(next);
      setRestoreConflict(null);
    },
  };
}

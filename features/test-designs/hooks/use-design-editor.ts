"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { ApiError } from "@/lib/api/error";
import { updateTestDesignProjectsProjectIdTestDesignsDesignIdPut as updateDesign } from "@/lib/api/generated/test-designs/test-designs";
import { withOrderedItemCodes, type Design } from "../lib/design";
import {
  readDraft,
  writeDraft,
  removeDraft,
  type DesignDraft,
} from "../lib/draft";
import { useConfirmAction } from "./use-confirm-action";
import { useTenant } from "@/features/tenants/providers/tenant-provider";

export function useDesignEditor(initial: Design) {
  const router = useRouter();
  const { confirm, confirmDialogProps } = useConfirmAction();
  const approvedNavigation = useRef(false);
  const { user } = useAuth();
  const { tenant } = useTenant();
  const draftKey = user
    ? `${user.demo ? `demo:${user.demo.id}:` : ""}${user.id}:tenant:${tenant?.id}:${initial.project_id}:${initial.id}`
    : null;
  const [recovery, setRecovery] = useState<DesignDraft | null>(null);
  const [draftError, setDraftError] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [design, setDesign] = useState(() => withOrderedItemCodes(initial));
  const [saved, setSaved] = useState(initial);
  const [past, setPast] = useState<Design[]>([]);
  const [future, setFuture] = useState<Design[]>([]);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [conflict, setConflict] = useState<Design | null>(null);
  const dirty = design !== saved;
  useEffect(() => {
    if (!draftKey) return;
    let active = true;
    readDraft(draftKey)
      .then(async (draft) => {
        if (draft || !user || user.demo) return draft;
        // Backendからこの組織の設計書を取得できた後だけ、旧形式の下書きを引き継ぐ。
        const legacyKey = `${user.id}:${initial.project_id}:${initial.id}`;
        const legacy = await readDraft(legacyKey);
        if (
          legacy &&
          legacy.design.id === initial.id &&
          legacy.design.project_id === initial.project_id
        ) {
          await writeDraft(draftKey, legacy);
          await removeDraft(legacyKey);
          return legacy;
        }
        return undefined;
      })
      .then((draft) => {
        if (active && draft && Date.now() - draft.savedAt < 7 * 86400000)
          setRecovery(draft);
      })
      .catch(() => {
        if (active) setDraftError(true);
      })
      .finally(() => {
        if (active) setDraftLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [draftKey, user, initial.id, initial.project_id]);
  useEffect(() => {
    if (!draftKey || !dirty || !draftLoaded || recovery) return;
    writeDraft(draftKey, {
      design,
      baseVersion: saved.version,
      savedAt: Date.now(),
    }).catch(() => setDraftError(true));
  }, [draftKey, design, dirty, saved.version, draftLoaded, recovery]);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!approvedNavigation.current) e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.shiftKey ||
        !(e.target instanceof Element)
      )
        return;
      const link = e.target.closest("a");
      if (!link || link.download || (link.target && link.target !== "_self"))
        return;
      const destination = new URL(link.href);
      if (destination.href === window.location.href) return;
      e.preventDefault();
      e.stopPropagation();
      confirm({
        title: "未保存の変更があります",
        description:
          "編集内容がまだ保存されていません。このまま移動すると変更内容が失われます。",
        cancelLabel: "編集を続ける",
        confirmLabel: "変更を破棄して移動",
        destructive: true,
        onConfirm: () => {
          if (destination.origin === window.location.origin) {
            router.push(
              destination.pathname + destination.search + destination.hash,
            );
          } else {
            approvedNavigation.current = true;
            window.location.assign(destination.href);
          }
        },
      });
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, confirm, router]);

  function change(mutate: (next: Design) => void) {
    if (savingRef.current) return;
    try {
      const next = structuredClone(design);
      mutate(next);
      setPast((p) => [...p.slice(-29), design]);
      setFuture([]);
      setRecovery(null);
      setDesign(next);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "編集できませんでした",
      );
    }
  }
  function undo() {
    if (savingRef.current || !past.length) return;
    setFuture((f) => [design, ...f]);
    setDesign(past.at(-1)!);
    setPast(past.slice(0, -1));
  }
  function redo() {
    if (savingRef.current || !future.length) return;
    setPast((p) => [...p, design]);
    setDesign(future[0]);
    setFuture(future.slice(1));
  }
  async function save() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const { id, project_id, updated_at: _updated, ...body } = design;
      void _updated;
      const result = await updateDesign(project_id, id, {
        ...body,
        version: saved.version,
      });
      setDesign(result);
      setSaved(result);
      setPast([]);
      setFuture([]);
      setRecovery(null);
      if (draftKey) void removeDraft(draftKey).catch(() => setDraftError(true));
      toast.success("テスト設計を保存しました");
      return result;
    } catch (error) {
      if (error instanceof ApiError && error.code === "VERSION_CONFLICT") {
        setConflict((error.data as { current: Design }).current);
      } else
        toast.error(
          error instanceof Error
            ? error.message
            : "保存できませんでした。編集内容は保持されています",
        );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  function exportDraft() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(design, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-design-${design.id}-draft.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function useLatest() {
    if (!conflict) return;
    setDesign(withOrderedItemCodes(conflict));
    setSaved(conflict);
    setPast([]);
    setFuture([]);
    setConflict(null);
    if (draftKey) void removeDraft(draftKey).catch(() => setDraftError(true));
  }
  function restoreDraft() {
    if (!recovery) return;
    setDesign(withOrderedItemCodes(recovery.design));
    setSaved({ ...initial, version: recovery.baseVersion });
    setRecovery(null);
  }
  function discardDraft() {
    setRecovery(null);
    if (draftKey) void removeDraft(draftKey).catch(() => setDraftError(true));
  }
  return {
    design,
    dirty,
    confirmDialogProps,
    saving,
    conflict,
    recovery,
    draftError,
    restoreDraft,
    discardDraft,
    change,
    undo,
    redo,
    canUndo: !!past.length,
    canRedo: !!future.length,
    save,
    exportDraft,
    useLatest,
    dismissConflict: () => setConflict(null),
  };
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { GanttOrderMove } from "@/lib/api/generated/model/ganttOrderMove";
import {
  getListPhasesProjectsProjectIdPhasesGetQueryKey,
  getReadGanttProjectsProjectIdGanttGetQueryKey,
} from "@/lib/api/generated/tasks/tasks";
import {
  moveGanttPhaseProjectsProjectIdGanttPhaseOrderPatch,
  moveGanttTaskProjectsProjectIdGanttTaskOrderPatch,
} from "@/lib/api/generated/gantt-order/gantt-order";

export function useGanttOrder(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      kind,
      move,
    }: {
      kind: "phase" | "task";
      move: GanttOrderMove;
      label: string;
      trigger: HTMLButtonElement | null;
    }) =>
      kind === "phase"
        ? moveGanttPhaseProjectsProjectIdGanttPhaseOrderPatch(projectId, move)
        : moveGanttTaskProjectsProjectIdGanttTaskOrderPatch(projectId, move),
    onSettled: async (_, error, { kind, label, trigger }) => {
      const queryKey =
        kind === "phase"
          ? getListPhasesProjectsProjectIdPhasesGetQueryKey(projectId)
          : getReadGanttProjectsProjectIdGanttGetQueryKey(projectId);
      await queryClient.invalidateQueries({ queryKey });
      if (trigger) {
        requestAnimationFrame(() => {
          if (document.activeElement === document.body && trigger.isConnected)
            trigger.focus({ preventScroll: true });
        });
      }
      if (error) toast.error("並び順を保存できませんでした。");
      else toast.success(`「${label}」の並び順を変更しました。`);
    },
  });
}

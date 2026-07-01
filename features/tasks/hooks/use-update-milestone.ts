"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { MilestoneRead } from "@/lib/api/generated/model";
import { useUpdateMilestoneMilestonesMilestoneIdPatch } from "@/lib/api/generated/tasks/tasks";
import { getConflictCurrent } from "@/lib/api/conflict";

import { TASK_MESSAGES } from "../constants/task-messages";
import { invalidateGantt, invalidateMilestoneList } from "../lib/task-cache";
import { toMilestoneUpdate } from "../lib/milestone-mappers";
import type { MilestoneFormValues } from "../types/milestone-form";

export function useUpdateMilestone(projectId: number) {
  const queryClient = useQueryClient();
  const [conflictCurrent, setConflictCurrent] = useState<MilestoneRead | null>(
    null,
  );
  const mutation = useUpdateMilestoneMilestonesMilestoneIdPatch({
    mutation: {
      onSuccess: async () => {
        setConflictCurrent(null);
        await Promise.all([
          invalidateMilestoneList(queryClient, projectId),
          invalidateGantt(queryClient, projectId),
        ]);
        toast.success(TASK_MESSAGES.milestone.updateSuccess);
      },
      onError: (error) => {
        const current = getConflictCurrent<MilestoneRead>(error);

        if (current) {
          setConflictCurrent(current);
          toast.error(TASK_MESSAGES.conflict);
          return;
        }

        toast.error(TASK_MESSAGES.milestone.updateError);
      },
    },
  });

  const updateMilestone = async (
    milestoneId: number,
    values: MilestoneFormValues,
    version: number,
  ) => {
    return mutation.mutateAsync({
      milestoneId,
      data: toMilestoneUpdate(values, version),
    });
  };

  return {
    updateMilestone,
    conflictCurrent,
    resetConflict: () => setConflictCurrent(null),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

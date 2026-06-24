"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDeleteMilestoneMilestonesMilestoneIdDelete } from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import { invalidateGantt, invalidateMilestoneList } from "../lib/task-cache";

export function useDeleteMilestone(projectId: number) {
  const queryClient = useQueryClient();
  const mutation = useDeleteMilestoneMilestonesMilestoneIdDelete({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          invalidateMilestoneList(queryClient, projectId),
          invalidateGantt(queryClient, projectId),
        ]);
        toast.success(TASK_MESSAGES.milestone.deleteSuccess);
      },
      onError: () => {
        toast.error(TASK_MESSAGES.milestone.deleteError);
      },
    },
  });

  const deleteMilestone = async (milestoneId: number) => {
    return mutation.mutateAsync({ milestoneId });
  };

  return {
    deleteMilestone,
    isPending: mutation.isPending,
  };
}

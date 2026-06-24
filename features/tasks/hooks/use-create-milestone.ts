"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCreateMilestoneProjectsProjectIdMilestonesPost } from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import { invalidateGantt, invalidateMilestoneList } from "../lib/task-cache";
import { toMilestoneCreate } from "../lib/milestone-mappers";
import type { MilestoneFormValues } from "../types/milestone-form";

export function useCreateMilestone(projectId: number) {
  const queryClient = useQueryClient();
  const mutation = useCreateMilestoneProjectsProjectIdMilestonesPost({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          invalidateMilestoneList(queryClient, projectId),
          invalidateGantt(queryClient, projectId),
        ]);
        toast.success(TASK_MESSAGES.milestone.createSuccess);
      },
      onError: () => {
        toast.error(TASK_MESSAGES.milestone.createError);
      },
    },
  });

  const createMilestone = async (values: MilestoneFormValues) => {
    return mutation.mutateAsync({
      projectId,
      data: toMilestoneCreate(values),
    });
  };

  return {
    createMilestone,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

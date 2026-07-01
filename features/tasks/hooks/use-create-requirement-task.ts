"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCreateRequirementTaskRequirementsRequirementIdTasksPost } from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import {
  invalidateGantt,
  invalidateRequirementTaskList,
  invalidateRequirementTaskProgress,
  invalidateTaskList,
} from "../lib/task-cache";
import { toRequirementTaskCreate } from "../lib/task-mappers";
import type { TaskFormValues } from "../types/task-form";

export function useCreateRequirementTask(
  projectId: number,
  requirementId: number,
) {
  const queryClient = useQueryClient();
  const mutation = useCreateRequirementTaskRequirementsRequirementIdTasksPost({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          invalidateTaskList(queryClient, projectId),
          invalidateGantt(queryClient, projectId),
          invalidateRequirementTaskList(queryClient, requirementId),
          invalidateRequirementTaskProgress(queryClient, requirementId),
        ]);
        toast.success(TASK_MESSAGES.task.createSuccess);
      },
      onError: () => {
        toast.error(TASK_MESSAGES.task.createError);
      },
    },
  });

  const createRequirementTask = async (values: TaskFormValues) => {
    return mutation.mutateAsync({
      requirementId,
      data: toRequirementTaskCreate({
        ...values,
        requirementId: String(requirementId),
      }),
    });
  };

  return {
    createRequirementTask,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

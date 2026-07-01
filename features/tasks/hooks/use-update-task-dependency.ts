"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useUpdateTaskDependencyTaskDependenciesDependencyIdPatch } from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import {
  invalidateGantt,
  invalidateTaskDependencies,
  invalidateTaskDetail,
} from "../lib/task-cache";

export function useUpdateTaskDependency(projectId: number, taskId: number) {
  const queryClient = useQueryClient();
  const mutation = useUpdateTaskDependencyTaskDependenciesDependencyIdPatch({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          invalidateTaskDependencies(queryClient, taskId),
          invalidateTaskDetail(queryClient, taskId),
          invalidateGantt(queryClient, projectId),
        ]);
        toast.success(TASK_MESSAGES.dependency.updateSuccess);
      },
      onError: () => {
        toast.error(TASK_MESSAGES.dependency.updateError);
      },
    },
  });

  const updateTaskDependency = async (
    dependencyId: number,
    version: number,
    lagDays: string,
  ) => {
    return mutation.mutateAsync({
      dependencyId,
      data: {
        version,
        dependency_type: "finish_to_start",
        lag_days: lagDays ? Number(lagDays) : 0,
      },
    });
  };

  return {
    updateTaskDependency,
    isPending: mutation.isPending,
  };
}

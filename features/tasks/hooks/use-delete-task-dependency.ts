"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDeleteTaskDependencyTaskDependenciesDependencyIdDelete } from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import {
  invalidateGantt,
  invalidateTaskDependencies,
  invalidateTaskDetail,
} from "../lib/task-cache";

export function useDeleteTaskDependency(projectId: number, taskId: number) {
  const queryClient = useQueryClient();
  const deleteDependencyMutation =
    useDeleteTaskDependencyTaskDependenciesDependencyIdDelete({
      mutation: {
        onSuccess: async () => {
          await Promise.all([
            invalidateTaskDependencies(queryClient, taskId),
            invalidateTaskDetail(queryClient, taskId),
            invalidateGantt(queryClient, projectId),
          ]);
          toast.success(TASK_MESSAGES.dependency.deleteSuccess);
        },
        onError: () => {
          toast.error(TASK_MESSAGES.dependency.deleteError);
        },
      },
    });

  const deleteTaskDependency = async (dependencyId: number) => {
    await deleteDependencyMutation.mutateAsync({ dependencyId });
  };

  return {
    deleteTaskDependency,
    isPending: deleteDependencyMutation.isPending,
  };
}

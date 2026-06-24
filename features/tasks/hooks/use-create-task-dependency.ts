"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCreateTaskDependencyTasksTaskIdDependenciesPost } from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import {
  invalidateGantt,
  invalidateTaskDependencies,
  invalidateTaskDetail,
} from "../lib/task-cache";
import type { TaskDependencyFormValues } from "../types/task-dependency-form";

export function useCreateTaskDependency(projectId: number, taskId: number) {
  const queryClient = useQueryClient();
  const createDependencyMutation =
    useCreateTaskDependencyTasksTaskIdDependenciesPost({
      mutation: {
        onSuccess: async () => {
          await Promise.all([
            invalidateTaskDependencies(queryClient, taskId),
            invalidateTaskDetail(queryClient, taskId),
            invalidateGantt(queryClient, projectId),
          ]);
          toast.success(TASK_MESSAGES.dependency.createSuccess);
        },
        onError: () => {
          toast.error(TASK_MESSAGES.dependency.createError);
        },
      },
    });

  const createTaskDependency = async (values: TaskDependencyFormValues) => {
    return createDependencyMutation.mutateAsync({
      taskId,
      data: {
        predecessor_task_id: Number(values.predecessorTaskId),
        successor_task_id: Number(values.successorTaskId),
        dependency_type: "finish_to_start",
        lag_days: values.lagDays ? Number(values.lagDays) : 0,
      },
    });
  };

  return {
    createTaskDependency,
    isPending: createDependencyMutation.isPending,
    error: createDependencyMutation.error,
  };
}

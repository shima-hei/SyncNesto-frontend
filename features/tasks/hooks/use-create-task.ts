"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCreateTaskProjectsProjectIdTasksPost } from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import {
  invalidateGantt,
  invalidateRequirementTaskList,
  invalidateRequirementTaskProgress,
  invalidateTaskList,
} from "../lib/task-cache";
import { toTaskCreate } from "../lib/task-mappers";
import type { TaskFormValues } from "../types/task-form";

export function useCreateTask(projectId: number) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const taskFormRequirementIdRef = useRef<number | null>(null);
  const shouldNavigateAfterCreateRef = useRef(true);
  const createTaskMutation = useCreateTaskProjectsProjectIdTasksPost({
    mutation: {
      onSuccess: async (task) => {
        const invalidations = [
          invalidateTaskList(queryClient, projectId),
          invalidateGantt(queryClient, projectId),
        ];
        const requirementId = taskFormRequirementIdRef.current;

        if (requirementId) {
          invalidations.push(
            invalidateRequirementTaskList(queryClient, requirementId),
            invalidateRequirementTaskProgress(queryClient, requirementId)
          );
        }

        await Promise.all(invalidations);
        toast.success(TASK_MESSAGES.task.createSuccess);
        if (shouldNavigateAfterCreateRef.current) {
          router.push(`/projects/joined/${projectId}/tasks/${task.id}`);
        }
      },
      onError: () => {
        toast.error(TASK_MESSAGES.task.createError);
      },
    },
  });

  const createTask = async (
    values: TaskFormValues,
    options?: { navigateAfterCreate?: boolean }
  ) => {
    taskFormRequirementIdRef.current = values.requirementId
      ? Number(values.requirementId)
      : null;
    shouldNavigateAfterCreateRef.current = options?.navigateAfterCreate ?? true;

    return createTaskMutation.mutateAsync({
      projectId,
      data: toTaskCreate(values),
    });
  };

  return {
    createTask,
    isPending: createTaskMutation.isPending,
    error: createTaskMutation.error,
  };
}

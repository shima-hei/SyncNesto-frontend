"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { toast } from "sonner";
import { useListNavigation } from "@/hooks/use-list-navigation";

import { useCreateTaskProjectsProjectIdTasksPost } from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import {
  invalidateTaskProjectSurfaces,
  invalidateRequirementTaskList,
  invalidateRequirementTaskProgress,
} from "../lib/task-cache";
import { toTaskCreate } from "../lib/task-mappers";
import type { TaskFormValues } from "../types/task-form";

export function useCreateTask(projectId: number) {
  const router = useRouter();
  const { withReturn } = useListNavigation(
    `/projects/joined/${projectId}/tasks`,
  );
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const createTaskMutation = useCreateTaskProjectsProjectIdTasksPost({
    mutation: {
      onSuccess: async (_task, { data }) => {
        const invalidations: Array<Promise<unknown>> = [
          invalidateTaskProjectSurfaces(queryClient, projectId),
        ];
        const requirementId = data.requirement_id;

        if (requirementId) {
          invalidations.push(
            invalidateRequirementTaskList(queryClient, requirementId),
            invalidateRequirementTaskProgress(queryClient, requirementId),
          );
        }

        await Promise.all(invalidations);
        toast.success(TASK_MESSAGES.task.createSuccess);
      },
      onError: () => {
        toast.error(TASK_MESSAGES.task.createError);
      },
    },
  });

  const createTask = async (
    values: TaskFormValues,
    options?: { navigateAfterCreate?: boolean },
  ) => {
    const task = await createTaskMutation.mutateAsync({
      projectId,
      data: toTaskCreate(values, user?.id),
    });
    if (options?.navigateAfterCreate ?? true) {
      router.push(withReturn(`/projects/joined/${projectId}/tasks/${task.id}`));
    }
    return task;
  };

  return {
    createTask,
    isPending: createTaskMutation.isPending,
    error: createTaskMutation.error,
  };
}

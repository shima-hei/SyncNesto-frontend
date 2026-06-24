"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { TaskRead } from "@/lib/api/generated/model";
import { useCreateTaskProjectsProjectIdTasksPost } from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import { invalidateGantt, invalidateTaskList } from "../lib/task-cache";
import { toTaskDuplicateCreate } from "../lib/task-mappers";

export function useDuplicateTask(projectId: number) {
  const queryClient = useQueryClient();
  const duplicateMutation = useCreateTaskProjectsProjectIdTasksPost({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          invalidateTaskList(queryClient, projectId),
          invalidateGantt(queryClient, projectId),
        ]);
        toast.success(TASK_MESSAGES.task.duplicateSuccess);
      },
      onError: () => {
        toast.error(TASK_MESSAGES.task.duplicateError);
      },
    },
  });

  const duplicateTask = async (task: TaskRead) => {
    return duplicateMutation.mutateAsync({
      projectId,
      data: toTaskDuplicateCreate(task),
    });
  };

  return {
    duplicateTask,
    isPending: duplicateMutation.isPending,
  };
}

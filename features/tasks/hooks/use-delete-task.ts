"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDeleteTaskTasksTaskIdDelete } from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import {
  invalidateGantt,
  invalidateTaskList,
  removeTaskDetailCache,
} from "../lib/task-cache";

export function useDeleteTask(projectId: number, taskId: number) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const deleteTaskMutation = useDeleteTaskTasksTaskIdDelete({
    mutation: {
      onSuccess: async () => {
        removeTaskDetailCache(queryClient, taskId);
        await Promise.all([
          invalidateTaskList(queryClient, projectId),
          invalidateGantt(queryClient, projectId),
        ]);
        toast.success(TASK_MESSAGES.task.deleteSuccess);
        router.push(`/projects/joined/${projectId}/tasks`);
      },
      onError: () => {
        toast.error(TASK_MESSAGES.task.deleteError);
      },
    },
  });

  const deleteTask = async () => {
    await deleteTaskMutation.mutateAsync({ taskId });
  };

  return {
    deleteTask,
    isPending: deleteTaskMutation.isPending,
    error: deleteTaskMutation.error,
  };
}

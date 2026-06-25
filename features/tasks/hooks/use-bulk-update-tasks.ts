"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { TaskRead } from "@/lib/api/generated/model";
import { useUpdateTaskTasksTaskIdPatch } from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import { invalidateTaskProjectSurfaces } from "../lib/task-cache";

export type TaskBulkUpdateValues = {
  status?: string;
  assigneeId?: string;
  dueDate?: string;
};

export function useBulkUpdateTasks(projectId: number) {
  const queryClient = useQueryClient();
  const updateMutation = useUpdateTaskTasksTaskIdPatch({
    mutation: {
      onSuccess: async () => {
        await invalidateTaskProjectSurfaces(queryClient, projectId);
      },
    },
  });

  const bulkUpdateTasks = async (
    tasks: TaskRead[],
    values: TaskBulkUpdateValues
  ) => {
    try {
      await Promise.all(
        tasks.map((task) =>
          updateMutation.mutateAsync({
            taskId: task.id,
            data: {
              version: task.version,
              status: values.status || undefined,
              assignee_id: values.assigneeId ? Number(values.assigneeId) : undefined,
              due_date: values.dueDate || undefined,
            },
          })
        )
      );
      toast.success(TASK_MESSAGES.task.bulkUpdateSuccess);
    } catch (error) {
      toast.error(TASK_MESSAGES.task.bulkUpdateError);
      throw error;
    }
  };

  return {
    bulkUpdateTasks,
    isPending: updateMutation.isPending,
  };
}

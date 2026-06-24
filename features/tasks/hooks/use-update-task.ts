"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getConflictCurrent } from "@/lib/api/conflict";
import type { TaskRead } from "@/lib/api/generated/model";
import { useUpdateTaskTasksTaskIdPatch } from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import {
  invalidateGantt,
  invalidateTaskChangeLogs,
  invalidateTaskList,
  setTaskDetailCache,
} from "../lib/task-cache";
import { toTaskUpdate } from "../lib/task-mappers";
import type { TaskFormValues } from "../types/task-form";

export function useUpdateTask(projectId: number, taskId: number) {
  const queryClient = useQueryClient();
  const [conflictCurrent, setConflictCurrent] = useState<TaskRead | null>(null);
  const updateTaskMutation = useUpdateTaskTasksTaskIdPatch({
    mutation: {
      onSuccess: async (task) => {
        setConflictCurrent(null);
        setTaskDetailCache(queryClient, taskId, task);
        await Promise.all([
          invalidateTaskList(queryClient, projectId),
          invalidateGantt(queryClient, projectId),
          invalidateTaskChangeLogs(queryClient, taskId),
        ]);
        toast.success(TASK_MESSAGES.task.updateSuccess);
      },
      onError: (error) => {
        const current = getConflictCurrent<TaskRead>(error);

        if (current) {
          setConflictCurrent(current);
          toast.error(TASK_MESSAGES.conflict);
          return;
        }

        toast.error(TASK_MESSAGES.task.updateError);
      },
    },
  });

  const updateTask = async (
    values: TaskFormValues,
    version: number,
    currentTask?: TaskRead
  ) => {
    return updateTaskMutation.mutateAsync({
      taskId,
      data: toTaskUpdate(values, version, currentTask),
    });
  };

  const resetConflict = () => {
    setConflictCurrent(null);
  };

  return {
    updateTask,
    conflictCurrent,
    resetConflict,
    isConflict: Boolean(conflictCurrent),
    isPending: updateTaskMutation.isPending,
    error: updateTaskMutation.error,
  };
}

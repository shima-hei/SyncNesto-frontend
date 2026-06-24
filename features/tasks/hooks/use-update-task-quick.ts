"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { TaskRead } from "@/lib/api/generated/model";
import { useUpdateTaskTasksTaskIdPatch } from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import {
  invalidateGantt,
  invalidateTaskList,
  setTaskDetailCache,
} from "../lib/task-cache";

type TaskQuickUpdateValues = {
  assigneeId?: string;
  startDate?: string;
  dueDate?: string;
  tags?: string;
};

const toNullableNumber = (value?: string) => {
  if (value === undefined) {
    return undefined;
  }

  return value.trim() ? Number(value) : null;
};

const toNullableDate = (value?: string) => {
  if (value === undefined) {
    return undefined;
  }

  return value || null;
};

const toTags = (value?: string) => {
  if (value === undefined) {
    return undefined;
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
};

export function useUpdateTaskQuick(projectId: number) {
  const queryClient = useQueryClient();
  const updateMutation = useUpdateTaskTasksTaskIdPatch({
    mutation: {
      onSuccess: async (task) => {
        setTaskDetailCache(queryClient, task.id, task);
        await Promise.all([
          invalidateTaskList(queryClient, projectId),
          invalidateGantt(queryClient, projectId),
        ]);
        toast.success(TASK_MESSAGES.task.updateSuccess);
      },
      onError: () => {
        toast.error(TASK_MESSAGES.task.updateError);
      },
    },
  });

  const updateTaskQuick = async (
    task: TaskRead,
    values: TaskQuickUpdateValues
  ) => {
    return updateMutation.mutateAsync({
      taskId: task.id,
      data: {
        version: task.version,
        assignee_id: toNullableNumber(values.assigneeId),
        start_date: toNullableDate(values.startDate),
        due_date: toNullableDate(values.dueDate),
        tags: toTags(values.tags),
      },
    });
  };

  return {
    updateTaskQuick,
    isPending: updateMutation.isPending,
  };
}

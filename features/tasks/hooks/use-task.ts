"use client";

import { useReadTaskTasksTaskIdGet } from "@/lib/api/generated/tasks/tasks";

export function useTask(taskId: number | null | undefined) {
  const taskQuery = useReadTaskTasksTaskIdGet(taskId ?? 0, {
    query: {
      enabled: Boolean(taskId),
      retry: false,
    },
  });

  return {
    task: taskQuery.data ?? null,
    isLoading: taskQuery.isLoading,
    error: taskQuery.error,
  };
}

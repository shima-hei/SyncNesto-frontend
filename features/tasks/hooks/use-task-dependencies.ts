"use client";

import { useListTaskDependenciesTasksTaskIdDependenciesGet } from "@/lib/api/generated/tasks/tasks";

export function useTaskDependencies(taskId: number) {
  const dependenciesQuery = useListTaskDependenciesTasksTaskIdDependenciesGet(
    taskId,
    {
      query: {
        retry: false,
      },
    },
  );

  return {
    dependencies: dependenciesQuery.data ?? [],
    isLoading: dependenciesQuery.isLoading,
    error: dependenciesQuery.error,
  };
}

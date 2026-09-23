"use client";

import { useListRequirementTasksRequirementsRequirementIdTasksGet } from "@/lib/api/generated/tasks/tasks";

export function useRequirementTasks(requirementId: number) {
  const tasksQuery = useListRequirementTasksRequirementsRequirementIdTasksGet(
    requirementId,
    {
      query: {
        retry: false,
      },
    },
  );

  return {
    tasks: tasksQuery.data ?? [],
    isLoading: tasksQuery.isLoading,
    error: tasksQuery.error,
  };
}

"use client";

import type { ReadGanttProjectsProjectIdGanttGetParams } from "@/lib/api/generated/model";
import { useReadGanttProjectsProjectIdGanttGet } from "@/lib/api/generated/tasks/tasks";

export function useGantt(
  projectId: number,
  params: ReadGanttProjectsProjectIdGanttGetParams,
  enabled = true,
) {
  const ganttQuery = useReadGanttProjectsProjectIdGanttGet(projectId, params, {
    query: {
      retry: false,
      enabled,
      placeholderData: (previousData) => previousData,
    },
  });

  return {
    gantt: ganttQuery.data ?? null,
    isLoading: ganttQuery.isLoading,
    isFetching: ganttQuery.isFetching,
    isPlaceholderData: ganttQuery.isPlaceholderData,
    error: ganttQuery.error,
    refetch: ganttQuery.refetch,
  };
}

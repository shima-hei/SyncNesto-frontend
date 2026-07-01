"use client";

import type { ReadGanttProjectsProjectIdGanttGetParams } from "@/lib/api/generated/model";
import { useReadGanttProjectsProjectIdGanttGet } from "@/lib/api/generated/tasks/tasks";

export function useGantt(
  projectId: number,
  params: ReadGanttProjectsProjectIdGanttGetParams,
) {
  const ganttQuery = useReadGanttProjectsProjectIdGanttGet(projectId, params, {
    query: {
      retry: false,
      placeholderData: (previousData) => previousData,
    },
  });

  return {
    gantt: ganttQuery.data ?? null,
    isLoading: ganttQuery.isLoading,
    isFetching: ganttQuery.isFetching,
    error: ganttQuery.error,
  };
}

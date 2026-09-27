"use client";

import type { ListTasksProjectsProjectIdTasksGetParams } from "@/lib/api/generated/model";
import { useListTasksProjectsProjectIdTasksGet } from "@/lib/api/generated/tasks/tasks";

export function useTasks(
  projectId: number,
  params: ListTasksProjectsProjectIdTasksGetParams,
) {
  const tasksQuery = useListTasksProjectsProjectIdTasksGet(projectId, params, {
    query: {
      retry: false,
      placeholderData: (previousData) => previousData,
    },
  });

  return {
    tasks: tasksQuery.data?.items ?? [],
    total: tasksQuery.data?.total ?? 0,
    page: tasksQuery.data?.page ?? params.page ?? 1,
    pageSize: tasksQuery.data?.page_size ?? params.page_size ?? 20,
    isLoading: tasksQuery.isLoading,
    isFetching: tasksQuery.isFetching,
    error: tasksQuery.error,
    refetch: tasksQuery.refetch,
  };
}

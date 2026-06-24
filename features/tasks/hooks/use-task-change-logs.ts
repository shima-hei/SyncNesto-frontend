"use client";

import { useListTaskChangeLogsTasksTaskIdChangeLogsGet } from "@/lib/api/generated/tasks/tasks";

const PAGE_SIZE = 20;

export function useTaskChangeLogs(taskId: number, page = 1) {
  const changeLogsQuery = useListTaskChangeLogsTasksTaskIdChangeLogsGet(
    taskId,
    {
      page,
      page_size: PAGE_SIZE,
    },
    {
      query: {
        retry: false,
        placeholderData: (previousData) => previousData,
      },
    }
  );

  return {
    changeLogs: changeLogsQuery.data?.items ?? [],
    total: changeLogsQuery.data?.total ?? 0,
    page: changeLogsQuery.data?.page ?? page,
    pageSize: changeLogsQuery.data?.page_size ?? PAGE_SIZE,
    isLoading: changeLogsQuery.isLoading,
    isFetching: changeLogsQuery.isFetching,
    error: changeLogsQuery.error,
  };
}

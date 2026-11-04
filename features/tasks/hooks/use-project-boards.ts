"use client";

import { useListBoardsProjectsProjectIdBoardsGet } from "@/lib/api/generated/tasks/tasks";
import { REFERENCE_STALE_TIME } from "@/lib/query/cache-policy";

export function useProjectBoards(projectId: number) {
  const boardsQuery = useListBoardsProjectsProjectIdBoardsGet(projectId, {
    query: {
      retry: false,
      staleTime: REFERENCE_STALE_TIME,
    },
  });

  return {
    boards: boardsQuery.data ?? [],
    defaultBoard: boardsQuery.data?.[0] ?? null,
    isLoading: boardsQuery.isLoading,
    error: boardsQuery.error,
  };
}

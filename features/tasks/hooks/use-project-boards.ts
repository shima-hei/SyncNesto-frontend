"use client";

import { useListBoardsProjectsProjectIdBoardsGet } from "@/lib/api/generated/tasks/tasks";

export function useProjectBoards(projectId: number) {
  const boardsQuery = useListBoardsProjectsProjectIdBoardsGet(projectId, {
    query: {
      retry: false,
      staleTime: 60_000,
    },
  });

  return {
    boards: boardsQuery.data ?? [],
    defaultBoard: boardsQuery.data?.[0] ?? null,
    isLoading: boardsQuery.isLoading,
    error: boardsQuery.error,
  };
}

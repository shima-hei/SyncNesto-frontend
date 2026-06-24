"use client";

import { useListTaskCommentsTasksTaskIdCommentsGet } from "@/lib/api/generated/tasks/tasks";

export function useTaskComments(taskId: number) {
  const commentsQuery = useListTaskCommentsTasksTaskIdCommentsGet(taskId, {
    query: {
      retry: false,
    },
  });

  return {
    comments: commentsQuery.data ?? [],
    isLoading: commentsQuery.isLoading,
    error: commentsQuery.error,
  };
}

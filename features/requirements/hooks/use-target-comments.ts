"use client";

import { useListTargetCommentsProjectsProjectIdCommentsGet } from "@/lib/api/generated/requirements/requirements";

export function useTargetComments(
  projectId: number,
  targetType: string,
  targetId: number
) {
  const commentsQuery = useListTargetCommentsProjectsProjectIdCommentsGet(
    projectId,
    { target_type: targetType, target_id: targetId },
    {
      query: {
        retry: false,
      },
    }
  );

  return {
    comments: commentsQuery.data ?? [],
    isLoading: commentsQuery.isLoading,
    error: commentsQuery.error,
  };
}

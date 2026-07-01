"use client";

import { useListTargetCommentsProjectsProjectIdCommentsGet } from "@/lib/api/generated/requirements/requirements";

export function useTargetComments(
  projectId: number,
  targetType: string,
  targetId: number,
  options?: { enabled?: boolean }
) {
  const commentsQuery = useListTargetCommentsProjectsProjectIdCommentsGet(
    projectId,
    { target_type: targetType, target_id: targetId },
    {
      query: {
        enabled: options?.enabled ?? true,
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

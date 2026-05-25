"use client";

import { useListRequirementCommentsProjectsProjectIdRequirementsRequirementIdCommentsGet } from "@/lib/api/generated/requirements/requirements";

export function useRequirementComments(projectId: number, requirementId: number) {
  const commentsQuery =
    useListRequirementCommentsProjectsProjectIdRequirementsRequirementIdCommentsGet(
      projectId,
      requirementId,
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

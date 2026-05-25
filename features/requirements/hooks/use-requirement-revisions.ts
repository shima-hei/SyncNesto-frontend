"use client";

import { useListRequirementRevisionsProjectsProjectIdRequirementsRequirementIdRevisionsGet } from "@/lib/api/generated/requirements/requirements";

export function useRequirementRevisions(
  projectId: number,
  requirementId: number
) {
  const revisionsQuery =
    useListRequirementRevisionsProjectsProjectIdRequirementsRequirementIdRevisionsGet(
      projectId,
      requirementId,
      {
        query: {
          retry: false,
        },
      }
    );

  return {
    revisions: revisionsQuery.data ?? [],
    isLoading: revisionsQuery.isLoading,
    error: revisionsQuery.error,
  };
}

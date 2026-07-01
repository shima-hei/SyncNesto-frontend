"use client";

import { useListRequirementRelationsProjectsProjectIdRequirementsRequirementIdRelationsGet } from "@/lib/api/generated/requirements/requirements";

export function useRequirementRelations(
  projectId: number,
  requirementId: number,
) {
  const relationsQuery =
    useListRequirementRelationsProjectsProjectIdRequirementsRequirementIdRelationsGet(
      projectId,
      requirementId,
      {
        query: {
          retry: false,
        },
      },
    );

  return {
    relations: relationsQuery.data ?? [],
    isLoading: relationsQuery.isLoading,
    error: relationsQuery.error,
  };
}

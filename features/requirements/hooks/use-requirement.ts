"use client";

import { useReadRequirementProjectsProjectIdRequirementsRequirementIdGet } from "@/lib/api/generated/requirements/requirements";

export function useRequirement(projectId: number, requirementId: number) {
  const requirementQuery =
    useReadRequirementProjectsProjectIdRequirementsRequirementIdGet(
      projectId,
      requirementId,
      {
        query: {
          retry: false,
        },
      }
    );

  return {
    requirement: requirementQuery.data ?? null,
    isLoading: requirementQuery.isLoading,
    error: requirementQuery.error,
  };
}

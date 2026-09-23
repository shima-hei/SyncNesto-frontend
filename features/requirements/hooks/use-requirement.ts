"use client";

import { useReadRequirementProjectsProjectIdRequirementsRequirementIdGet } from "@/lib/api/generated/requirements/requirements";

type UseRequirementOptions = {
  enabled?: boolean;
};

export function useRequirement(
  projectId: number,
  requirementId: number,
  options: UseRequirementOptions = {},
) {
  const requirementQuery =
    useReadRequirementProjectsProjectIdRequirementsRequirementIdGet(
      projectId,
      requirementId,
      {
        query: {
          enabled: options.enabled ?? true,
          retry: false,
        },
      },
    );

  return {
    requirement: requirementQuery.data ?? null,
    isLoading: requirementQuery.isLoading,
    error: requirementQuery.error,
  };
}

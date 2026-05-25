"use client";

import { useListRequirementLinksProjectsProjectIdRequirementsRequirementIdLinksGet } from "@/lib/api/generated/requirements/requirements";

export function useRequirementLinks(projectId: number, requirementId: number) {
  const linksQuery =
    useListRequirementLinksProjectsProjectIdRequirementsRequirementIdLinksGet(
      projectId,
      requirementId,
      {
        query: {
          retry: false,
        },
      }
    );

  return {
    links: linksQuery.data ?? [],
    isLoading: linksQuery.isLoading,
    error: linksQuery.error,
  };
}

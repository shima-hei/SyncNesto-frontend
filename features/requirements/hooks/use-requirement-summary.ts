"use client";

import { useReadRequirementSummaryProjectsProjectIdRequirementsRequirementIdSummaryGet } from "@/lib/api/generated/requirements/requirements";

export function useRequirementSummary(projectId: number, requirementId: number) {
  const summaryQuery =
    useReadRequirementSummaryProjectsProjectIdRequirementsRequirementIdSummaryGet(
      projectId,
      requirementId,
      {
        query: {
          retry: false,
        },
      }
    );

  return {
    summary: summaryQuery.data ?? null,
    isLoading: summaryQuery.isLoading,
    error: summaryQuery.error,
  };
}

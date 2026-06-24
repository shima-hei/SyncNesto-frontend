"use client";

import { useReadRequirementTaskProgressRequirementsRequirementIdTaskProgressGet } from "@/lib/api/generated/tasks/tasks";

export function useTaskProgress(requirementId: number) {
  const progressQuery =
    useReadRequirementTaskProgressRequirementsRequirementIdTaskProgressGet(
      requirementId,
      {
        query: {
          retry: false,
        },
      }
    );

  return {
    progress: progressQuery.data ?? null,
    isLoading: progressQuery.isLoading,
    error: progressQuery.error,
  };
}

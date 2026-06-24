"use client";

import { useListMilestonesProjectsProjectIdMilestonesGet } from "@/lib/api/generated/tasks/tasks";

export function useMilestones(projectId: number) {
  const { data, isLoading, isFetching, error } =
    useListMilestonesProjectsProjectIdMilestonesGet(projectId);

  return {
    milestones: data ?? [],
    isLoading,
    isFetching,
    error,
  };
}

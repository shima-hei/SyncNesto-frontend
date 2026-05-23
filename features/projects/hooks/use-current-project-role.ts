"use client";

import { useReadCurrentProjectRoleProjectsProjectIdMeGet } from "@/lib/api/generated/projects/projects";

export function useCurrentProjectRole(projectId: number) {
  const projectRoleQuery = useReadCurrentProjectRoleProjectsProjectIdMeGet(
    projectId,
    {
      query: {
        retry: false,
      },
    }
  );

  return {
    currentProjectRole: projectRoleQuery.data ?? null,
    isLoading: projectRoleQuery.isLoading,
    error: projectRoleQuery.error,
  };
}

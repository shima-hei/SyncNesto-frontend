"use client";

import { useListProjectMembersProjectsProjectIdMembersGet } from "@/lib/api/generated/projects/projects";

export function useProjectMembers(projectId: number) {
  const membersQuery = useListProjectMembersProjectsProjectIdMembersGet(
    projectId,
    {
      query: {
        retry: false,
      },
    }
  );

  return {
    members: membersQuery.data ?? [],
    isLoading: membersQuery.isLoading,
    error: membersQuery.error,
  };
}

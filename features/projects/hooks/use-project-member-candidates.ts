"use client";

import type { ListProjectMemberCandidatesProjectsProjectIdMemberCandidatesGetParams } from "@/lib/api/generated/model";
import { useListProjectMemberCandidatesProjectsProjectIdMemberCandidatesGet } from "@/lib/api/generated/projects/projects";

export function useProjectMemberCandidates(
  projectId: number,
  params: ListProjectMemberCandidatesProjectsProjectIdMemberCandidatesGetParams
) {
  const usersQuery = useListProjectMemberCandidatesProjectsProjectIdMemberCandidatesGet(
    projectId,
    params,
    {
      query: {
        retry: false,
        placeholderData: (previousData) => previousData,
      },
    }
  );

  return {
    users: usersQuery.data?.items ?? [],
    isLoading: usersQuery.isLoading,
    isFetching: usersQuery.isFetching,
    error: usersQuery.error,
  };
}

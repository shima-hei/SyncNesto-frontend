"use client";

import type { ListProjectMemberUsersProjectsProjectIdMemberUsersGetParams } from "@/lib/api/generated/model";
import { useListProjectMemberUsersProjectsProjectIdMemberUsersGet } from "@/lib/api/generated/projects/projects";

export function useProjectMemberUsers(
  projectId: number,
  params: ListProjectMemberUsersProjectsProjectIdMemberUsersGetParams
) {
  const usersQuery = useListProjectMemberUsersProjectsProjectIdMemberUsersGet(
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

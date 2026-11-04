"use client";

import type { ListProjectMemberUsersProjectsProjectIdMemberUsersGetParams } from "@/lib/api/generated/model";
import { useListProjectMemberUsersProjectsProjectIdMemberUsersGet } from "@/lib/api/generated/projects/projects";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  REFERENCE_STALE_TIME,
  SEARCH_DEBOUNCE_MS,
} from "@/lib/query/cache-policy";

export function useProjectMemberUsers(
  projectId: number,
  params: ListProjectMemberUsersProjectsProjectIdMemberUsersGetParams,
) {
  const q = useDebouncedValue(params.q?.trim() ?? "", SEARCH_DEBOUNCE_MS);
  const usersQuery = useListProjectMemberUsersProjectsProjectIdMemberUsersGet(
    projectId,
    { ...params, q: q || undefined },
    {
      query: {
        retry: false,
        staleTime: REFERENCE_STALE_TIME,
        placeholderData: (previousData) => previousData,
      },
    },
  );

  return {
    users: usersQuery.data?.items ?? [],
    isLoading: usersQuery.isLoading,
    isFetching: usersQuery.isFetching,
    error: usersQuery.error,
  };
}

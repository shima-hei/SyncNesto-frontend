"use client";

import type { ListProjectMemberCandidatesProjectsProjectIdMemberCandidatesGetParams } from "@/lib/api/generated/model";
import { useListProjectMemberCandidatesProjectsProjectIdMemberCandidatesGet } from "@/lib/api/generated/projects/projects";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  REFERENCE_STALE_TIME,
  SEARCH_DEBOUNCE_MS,
} from "@/lib/query/cache-policy";

export function useProjectMemberCandidates(
  projectId: number,
  params: ListProjectMemberCandidatesProjectsProjectIdMemberCandidatesGetParams,
) {
  const q = useDebouncedValue(params.q?.trim() ?? "", SEARCH_DEBOUNCE_MS);
  const usersQuery =
    useListProjectMemberCandidatesProjectsProjectIdMemberCandidatesGet(
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

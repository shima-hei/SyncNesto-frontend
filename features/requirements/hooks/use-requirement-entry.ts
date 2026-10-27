"use client";

import { useListRequirementDocumentsProjectsProjectIdRequirementDocumentsGet } from "@/lib/api/generated/requirements/requirements";
import { requirementEntryState } from "../lib/requirement-entry";

export function useRequirementEntry(projectId: number, enabled: boolean) {
  const query =
    useListRequirementDocumentsProjectsProjectIdRequirementDocumentsGet(
      projectId,
      { page: 1, page_size: 2 },
      {
        query: {
          enabled,
          retry: false,
          staleTime: 0,
          refetchOnMount: "always",
          placeholderData: undefined,
        },
      },
    );
  const state = requirementEntryState({
    data: query.data,
    fresh: query.isFetchedAfterMount,
    fetching: query.fetchStatus !== "idle",
    placeholder: query.isPlaceholderData,
    error: query.error,
  });
  return { ...state, refetch: query.refetch, isFetching: query.isFetching };
}

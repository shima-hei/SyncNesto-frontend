"use client";

import { useListOpenIssuesProjectsProjectIdOpenIssuesGet } from "@/lib/api/generated/requirements/requirements";

export function useOpenIssues(
  projectId: number,
  documentId: number,
  options?: { page: number; pageSize: number; resolved?: boolean },
) {
  const openIssuesQuery = useListOpenIssuesProjectsProjectIdOpenIssuesGet(
    projectId,
    {
      document_id: documentId,
      page: options?.page ?? 1,
      page_size: options?.pageSize ?? 50,
      resolved: options?.resolved,
    },
    {
      query: {
        retry: false,
      },
    },
  );

  return {
    openIssues: openIssuesQuery.data?.items ?? [],
    isLoading: openIssuesQuery.isLoading,
    isFetching: openIssuesQuery.isFetching,
    total: openIssuesQuery.data?.total,
    error: openIssuesQuery.error,
    refetch: openIssuesQuery.refetch,
  };
}

"use client";

import { useListOpenIssuesProjectsProjectIdOpenIssuesGet } from "@/lib/api/generated/requirements/requirements";

export function useOpenIssues(projectId: number, documentId: number) {
  const openIssuesQuery = useListOpenIssuesProjectsProjectIdOpenIssuesGet(
    projectId,
    { document_id: documentId, page: 1, page_size: 50 },
    {
      query: {
        retry: false,
      },
    }
  );

  return {
    openIssues: openIssuesQuery.data?.items ?? [],
    isLoading: openIssuesQuery.isLoading,
    error: openIssuesQuery.error,
  };
}

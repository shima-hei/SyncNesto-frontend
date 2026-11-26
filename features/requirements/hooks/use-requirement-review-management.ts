"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { readRequirementReviewManagementProjectsProjectIdRequirementDocumentsDocumentIdReviewManagementGet as readManagement } from "@/lib/api/generated/requirement-workflow/requirement-workflow";

export const requirementReviewManagementPageSize = 10;

export function useRequirementReviewManagement(
  projectId: number,
  documentId: number,
  {
    view = "open",
    resolved = false,
    page = 1,
    enabled = true,
  }: {
    view?: string;
    resolved?: boolean | null;
    page?: number;
    enabled?: boolean;
  } = {},
) {
  return useQuery({
    queryKey: [
      "requirement-workflow",
      projectId,
      "management",
      documentId,
      view,
      page,
    ],
    queryFn: ({ signal }) =>
      readManagement(
        projectId,
        documentId,
        {
          resolved: resolved ?? undefined,
          page,
          page_size: requirementReviewManagementPageSize,
        },
        { signal },
      ),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });
}

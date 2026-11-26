"use client";

import { useQuery } from "@tanstack/react-query";
import { readRequirementWorkflowProjectsProjectIdRequirementWorkflowRequestIdGet as readRequest } from "@/lib/api/generated/requirement-workflow/requirement-workflow";

export function useRequirementReviewRequest(
  projectId: number,
  requestId?: string | null,
) {
  return useQuery({
    queryKey: ["requirement-item-review", projectId, requestId],
    queryFn: ({ signal }) =>
      readRequest(projectId, requestId ?? "", { signal }),
    enabled: Boolean(requestId),
    retry: false,
  });
}

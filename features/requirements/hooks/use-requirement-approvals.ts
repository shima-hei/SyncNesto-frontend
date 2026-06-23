"use client";

import { useListRequirementApprovalsProjectsProjectIdApprovalsGet } from "@/lib/api/generated/requirements/requirements";

export function useRequirementApprovals(
  projectId: number,
  targetType: string,
  targetId: number
) {
  const approvalsQuery = useListRequirementApprovalsProjectsProjectIdApprovalsGet(
    projectId,
    { target_type: targetType, target_id: targetId, page: 1, page_size: 20 },
    {
      query: {
        retry: false,
      },
    }
  );

  return {
    approvals: approvalsQuery.data?.items ?? [],
    isLoading: approvalsQuery.isLoading,
    error: approvalsQuery.error,
  };
}

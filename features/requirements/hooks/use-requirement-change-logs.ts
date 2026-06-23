"use client";

import { useListRequirementChangeLogsProjectsProjectIdChangeLogsGet } from "@/lib/api/generated/requirements/requirements";

type UseRequirementChangeLogsOptions = {
  targetType?: string;
  targetId?: number;
};

export function useRequirementChangeLogs(
  projectId: number,
  documentId: number,
  options: UseRequirementChangeLogsOptions = {}
) {
  const changeLogsQuery =
    useListRequirementChangeLogsProjectsProjectIdChangeLogsGet(
      projectId,
      {
        document_id: documentId,
        target_type: options.targetType,
        target_id: options.targetId,
        page: 1,
        page_size: 20,
      },
      {
        query: {
          retry: false,
        },
      }
    );

  return {
    changeLogs: changeLogsQuery.data?.items ?? [],
    isLoading: changeLogsQuery.isLoading,
    error: changeLogsQuery.error,
  };
}

"use client";

import type { ListRequirementsProjectsProjectIdRequirementsGetParams } from "@/lib/api/generated/model";
import { useListRequirementsProjectsProjectIdRequirementsGet } from "@/lib/api/generated/requirements/requirements";

export function useRequirements(
  projectId: number,
  params: ListRequirementsProjectsProjectIdRequirementsGetParams
) {
  const requirementsQuery = useListRequirementsProjectsProjectIdRequirementsGet(
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
    requirements: requirementsQuery.data?.items ?? [],
    total: requirementsQuery.data?.total ?? 0,
    page: requirementsQuery.data?.page ?? params.page ?? 1,
    pageSize: requirementsQuery.data?.page_size ?? params.page_size ?? 20,
    isLoading: requirementsQuery.isLoading,
    isFetching: requirementsQuery.isFetching,
    error: requirementsQuery.error,
  };
}

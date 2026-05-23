"use client";

import type { ListRequirementDocumentsProjectsProjectIdRequirementDocumentsGetParams } from "@/lib/api/generated/model";
import { useListRequirementDocumentsProjectsProjectIdRequirementDocumentsGet } from "@/lib/api/generated/requirements/requirements";

export function useRequirementDocuments(
  projectId: number,
  params: ListRequirementDocumentsProjectsProjectIdRequirementDocumentsGetParams
) {
  const documentsQuery =
    useListRequirementDocumentsProjectsProjectIdRequirementDocumentsGet(
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
    documents: documentsQuery.data?.items ?? [],
    total: documentsQuery.data?.total ?? 0,
    page: documentsQuery.data?.page ?? params.page ?? 1,
    pageSize: documentsQuery.data?.page_size ?? params.page_size ?? 20,
    isLoading: documentsQuery.isLoading,
    isFetching: documentsQuery.isFetching,
    error: documentsQuery.error,
  };
}

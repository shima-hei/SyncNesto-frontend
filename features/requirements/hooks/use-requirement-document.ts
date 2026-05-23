"use client";

import { useReadRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdGet } from "@/lib/api/generated/requirements/requirements";

export function useRequirementDocument(projectId: number, documentId: number) {
  const documentQuery =
    useReadRequirementDocumentProjectsProjectIdRequirementDocumentsDocumentIdGet(
      projectId,
      documentId,
      {
        query: {
          retry: false,
        },
      }
    );

  return {
    document: documentQuery.data ?? null,
    isLoading: documentQuery.isLoading,
    error: documentQuery.error,
  };
}

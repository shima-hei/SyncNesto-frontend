"use client";

import { useListRequirementSectionsProjectsProjectIdRequirementDocumentsDocumentIdSectionsGet } from "@/lib/api/generated/requirements/requirements";

export function useRequirementSections(projectId: number, documentId: number) {
  const sectionsQuery =
    useListRequirementSectionsProjectsProjectIdRequirementDocumentsDocumentIdSectionsGet(
      projectId,
      documentId,
      {
        query: {
          retry: false,
        },
      },
    );

  return {
    sections: sectionsQuery.data ?? [],
    isLoading: sectionsQuery.isLoading,
    error: sectionsQuery.error,
  };
}

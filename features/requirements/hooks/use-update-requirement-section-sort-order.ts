"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { RequirementSectionRead } from "@/lib/api/generated/model";
import { useUpdateRequirementSectionSortOrderProjectsProjectIdRequirementDocumentsDocumentIdSectionsSortOrderPatch } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementChangeLogs,
  invalidateRequirementSections,
} from "../lib/requirement-cache";

export function useUpdateRequirementSectionSortOrder(
  projectId: number,
  documentId: number
) {
  const queryClient = useQueryClient();
  const updateSortOrderMutation =
    useUpdateRequirementSectionSortOrderProjectsProjectIdRequirementDocumentsDocumentIdSectionsSortOrderPatch(
      {
        mutation: {
          onSuccess: async () => {
            await Promise.all([
              invalidateRequirementSections(queryClient, projectId, documentId),
              invalidateRequirementChangeLogs(queryClient, projectId),
            ]);
            toast.success(REQUIREMENT_MESSAGES.section.sortSuccess);
          },
          onError: () => {
            toast.error(REQUIREMENT_MESSAGES.section.sortError);
          },
        },
      }
    );

  const updateRequirementSectionSortOrder = async (
    sections: RequirementSectionRead[]
  ) => {
    await updateSortOrderMutation.mutateAsync({
      projectId,
      documentId,
      data: {
        items: sections.map((section, index) => ({
          section_id: section.id,
          sort_order: (index + 1) * 10,
          version: section.version,
        })),
      },
    });
  };

  return {
    updateRequirementSectionSortOrder,
    isPending: updateSortOrderMutation.isPending,
  };
}

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDeleteRequirementSectionProjectsProjectIdRequirementSectionsSectionIdDelete } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementChangeLogs,
  invalidateRequirementSections,
} from "../lib/requirement-cache";

export function useDeleteRequirementSection(
  projectId: number,
  documentId: number
) {
  const queryClient = useQueryClient();
  const deleteSectionMutation =
    useDeleteRequirementSectionProjectsProjectIdRequirementSectionsSectionIdDelete(
      {
        mutation: {
          onSuccess: async () => {
            await Promise.all([
              invalidateRequirementSections(queryClient, projectId, documentId),
              invalidateRequirementChangeLogs(queryClient, projectId),
            ]);
            toast.success(REQUIREMENT_MESSAGES.section.deleteSuccess);
          },
          onError: () => {
            toast.error(REQUIREMENT_MESSAGES.section.deleteError);
          },
        },
      }
    );

  const deleteRequirementSection = async (sectionId: number) => {
    await deleteSectionMutation.mutateAsync({
      projectId,
      sectionId,
    });
  };

  return {
    deleteRequirementSection,
    isPending: deleteSectionMutation.isPending,
    error: deleteSectionMutation.error,
  };
}

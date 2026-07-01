"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCreateRequirementSectionProjectsProjectIdRequirementDocumentsDocumentIdSectionsPost } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementChangeLogs,
  invalidateRequirementSections,
} from "../lib/requirement-cache";
import { toRequirementSectionCreate } from "../lib/requirement-mappers";
import type { RequirementSectionFormValues } from "../types/requirement-section-form";

export function useCreateRequirementSection(
  projectId: number,
  documentId: number,
) {
  const queryClient = useQueryClient();
  const createSectionMutation =
    useCreateRequirementSectionProjectsProjectIdRequirementDocumentsDocumentIdSectionsPost(
      {
        mutation: {
          onSuccess: async () => {
            await Promise.all([
              invalidateRequirementSections(queryClient, projectId, documentId),
              invalidateRequirementChangeLogs(queryClient, projectId),
            ]);
            toast.success(REQUIREMENT_MESSAGES.section.createSuccess);
          },
          onError: () => {
            toast.error(REQUIREMENT_MESSAGES.section.createError);
          },
        },
      },
    );

  const createRequirementSection = async (
    values: RequirementSectionFormValues,
  ) => {
    return createSectionMutation.mutateAsync({
      projectId,
      documentId,
      data: toRequirementSectionCreate(values),
    });
  };

  return {
    createRequirementSection,
    isPending: createSectionMutation.isPending,
    error: createSectionMutation.error,
  };
}

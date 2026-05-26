"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDeleteRequirementLinkProjectsProjectIdRequirementsRequirementIdLinksLinkIdDelete } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import { invalidateRequirementLinksWithSummary } from "../lib/requirement-cache";

export function useDeleteRequirementLink(
  projectId: number,
  requirementId: number
) {
  const queryClient = useQueryClient();
  const deleteLinkMutation =
    useDeleteRequirementLinkProjectsProjectIdRequirementsRequirementIdLinksLinkIdDelete(
      {
        mutation: {
          onSuccess: async () => {
            await invalidateRequirementLinksWithSummary(
              queryClient,
              projectId,
              requirementId
            );
            toast.success(REQUIREMENT_MESSAGES.link.deleteSuccess);
          },
          onError: () => {
            toast.error(REQUIREMENT_MESSAGES.link.deleteError);
          },
        },
      }
    );

  const deleteRequirementLink = async (linkId: number) => {
    await deleteLinkMutation.mutateAsync({
      projectId,
      requirementId,
      linkId,
    });
  };

  return {
    deleteRequirementLink,
    isPending: deleteLinkMutation.isPending,
    error: deleteLinkMutation.error,
  };
}

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useUpdateRequirementLinkProjectsProjectIdRequirementsRequirementIdLinksLinkIdPatch } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import { invalidateRequirementLinksWithSummary } from "../lib/requirement-cache";
import { toRequirementLinkUpdate } from "../lib/requirement-mappers";
import type { RequirementLinkFormValues } from "../types/requirement-link-form";

export function useUpdateRequirementLink(
  projectId: number,
  requirementId: number,
) {
  const queryClient = useQueryClient();
  const updateLinkMutation =
    useUpdateRequirementLinkProjectsProjectIdRequirementsRequirementIdLinksLinkIdPatch(
      {
        mutation: {
          onSuccess: async () => {
            await invalidateRequirementLinksWithSummary(
              queryClient,
              projectId,
              requirementId,
            );
            toast.success(REQUIREMENT_MESSAGES.link.updateSuccess);
          },
          onError: () => {
            toast.error(REQUIREMENT_MESSAGES.link.updateError);
          },
        },
      },
    );

  const updateRequirementLink = async (
    linkId: number,
    values: RequirementLinkFormValues,
  ) => {
    return updateLinkMutation.mutateAsync({
      projectId,
      requirementId,
      linkId,
      data: toRequirementLinkUpdate(values),
    });
  };

  return {
    updateRequirementLink,
    isPending: updateLinkMutation.isPending,
    error: updateLinkMutation.error,
  };
}

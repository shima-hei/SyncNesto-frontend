"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  useCreateRequirementLinkProjectsProjectIdRequirementsRequirementIdLinksPost,
} from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import { invalidateRequirementLinksWithSummary } from "../lib/requirement-cache";
import { toRequirementLinkCreate } from "../lib/requirement-mappers";
import type { RequirementLinkFormValues } from "../types/requirement-link-form";

export function useCreateRequirementLink(
  projectId: number,
  requirementId: number
) {
  const queryClient = useQueryClient();
  const createLinkMutation =
    useCreateRequirementLinkProjectsProjectIdRequirementsRequirementIdLinksPost({
      mutation: {
        onSuccess: async () => {
          await invalidateRequirementLinksWithSummary(
            queryClient,
            projectId,
            requirementId
          );
          toast.success(REQUIREMENT_MESSAGES.link.createSuccess);
        },
        onError: () => {
          toast.error(REQUIREMENT_MESSAGES.link.createError);
        },
      },
    });

  const createRequirementLink = async (values: RequirementLinkFormValues) => {
    return createLinkMutation.mutateAsync({
      projectId,
      requirementId,
      data: toRequirementLinkCreate(values),
    });
  };

  return {
    createRequirementLink,
    isPending: createLinkMutation.isPending,
    error: createLinkMutation.error,
  };
}

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCreateRequirementDetailProjectsProjectIdRequirementsRequirementIdDetailsPost } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import { invalidateRequirementSummary } from "../lib/requirement-cache";
import { toRequirementDetailCreate } from "../lib/requirement-mappers";
import type { RequirementDetailFormValues } from "../types/requirement-detail-form";

export function useCreateRequirementDetail(
  projectId: number,
  requirementId: number,
) {
  const queryClient = useQueryClient();
  const createDetailMutation =
    useCreateRequirementDetailProjectsProjectIdRequirementsRequirementIdDetailsPost(
      {
        mutation: {
          onSuccess: async () => {
            await invalidateRequirementSummary(
              queryClient,
              projectId,
              requirementId,
            );
            toast.success(REQUIREMENT_MESSAGES.detail.createSuccess);
          },
          onError: () => {
            toast.error(REQUIREMENT_MESSAGES.detail.createError);
          },
        },
      },
    );

  const createRequirementDetail = async (
    values: RequirementDetailFormValues,
  ) => {
    return createDetailMutation.mutateAsync({
      projectId,
      requirementId,
      data: toRequirementDetailCreate(values),
    });
  };

  return {
    createRequirementDetail,
    isPending: createDetailMutation.isPending,
    error: createDetailMutation.error,
  };
}

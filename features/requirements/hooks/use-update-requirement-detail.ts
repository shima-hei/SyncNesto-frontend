"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useUpdateRequirementDetailProjectsProjectIdRequirementsRequirementIdDetailsDetailIdPatch } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import { invalidateRequirementSummary } from "../lib/requirement-cache";
import { toRequirementDetailUpdate } from "../lib/requirement-mappers";
import type { RequirementDetailFormValues } from "../types/requirement-detail-form";

export function useUpdateRequirementDetail(
  projectId: number,
  requirementId: number
) {
  const queryClient = useQueryClient();
  const updateDetailMutation =
    useUpdateRequirementDetailProjectsProjectIdRequirementsRequirementIdDetailsDetailIdPatch({
      mutation: {
        onSuccess: async () => {
          await invalidateRequirementSummary(queryClient, projectId, requirementId);
          toast.success(REQUIREMENT_MESSAGES.detail.updateSuccess);
        },
        onError: () => {
          toast.error(REQUIREMENT_MESSAGES.detail.updateError);
        },
      },
    });

  const updateRequirementDetail = async (
    detailId: number,
    values: RequirementDetailFormValues
  ) => {
    return updateDetailMutation.mutateAsync({
      projectId,
      requirementId,
      detailId,
      data: toRequirementDetailUpdate(values),
    });
  };

  return {
    updateRequirementDetail,
    isPending: updateDetailMutation.isPending,
    error: updateDetailMutation.error,
  };
}

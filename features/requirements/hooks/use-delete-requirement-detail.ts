"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDeleteRequirementDetailProjectsProjectIdRequirementsRequirementIdDetailsDetailIdDelete } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import { invalidateRequirementSummary } from "../lib/requirement-cache";

export function useDeleteRequirementDetail(
  projectId: number,
  requirementId: number
) {
  const queryClient = useQueryClient();
  const deleteDetailMutation =
    useDeleteRequirementDetailProjectsProjectIdRequirementsRequirementIdDetailsDetailIdDelete({
      mutation: {
        onSuccess: async () => {
          await invalidateRequirementSummary(queryClient, projectId, requirementId);
          toast.success(REQUIREMENT_MESSAGES.detail.deleteSuccess);
        },
        onError: () => {
          toast.error(REQUIREMENT_MESSAGES.detail.deleteError);
        },
      },
    });

  const deleteRequirementDetail = async (detailId: number) => {
    return deleteDetailMutation.mutateAsync({
      projectId,
      requirementId,
      detailId,
    });
  };

  return {
    deleteRequirementDetail,
    isPending: deleteDetailMutation.isPending,
  };
}

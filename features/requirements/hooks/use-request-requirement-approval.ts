"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useRequestRequirementApprovalProjectsProjectIdApprovalsRequestPost } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementApprovals,
  invalidateRequirementChangeLogs,
} from "../lib/requirement-cache";
import { toRequirementApprovalRequestCreate } from "../lib/requirement-mappers";
import type { RequirementApprovalRequestFormValues } from "../types/requirement-approval-form";

export function useRequestRequirementApproval(
  projectId: number,
  targetType: string,
  targetId: number,
) {
  const queryClient = useQueryClient();
  const requestApprovalMutation =
    useRequestRequirementApprovalProjectsProjectIdApprovalsRequestPost({
      mutation: {
        onSuccess: async () => {
          await Promise.all([
            invalidateRequirementApprovals(queryClient, projectId),
            invalidateRequirementChangeLogs(queryClient, projectId),
          ]);
          toast.success(REQUIREMENT_MESSAGES.approval.requestSuccess);
        },
        onError: () => {
          toast.error(REQUIREMENT_MESSAGES.approval.requestError);
        },
      },
    });

  const requestRequirementApproval = async (
    values: RequirementApprovalRequestFormValues,
  ) => {
    return requestApprovalMutation.mutateAsync({
      projectId,
      data: toRequirementApprovalRequestCreate(values, targetType, targetId),
    });
  };

  return {
    requestRequirementApproval,
    isPending: requestApprovalMutation.isPending,
    error: requestApprovalMutation.error,
  };
}

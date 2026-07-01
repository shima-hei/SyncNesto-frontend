"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  useApproveRequirementApprovalProjectsProjectIdApprovalsApprovalIdApprovePost,
  useRejectRequirementApprovalProjectsProjectIdApprovalsApprovalIdRejectPost,
} from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementApprovals,
  invalidateRequirementChangeLogs,
} from "../lib/requirement-cache";

export function useDecideRequirementApproval(projectId: number) {
  const queryClient = useQueryClient();
  const approveMutation =
    useApproveRequirementApprovalProjectsProjectIdApprovalsApprovalIdApprovePost(
      {
        mutation: {
          onSuccess: async () => {
            await Promise.all([
              invalidateRequirementApprovals(queryClient, projectId),
              invalidateRequirementChangeLogs(queryClient, projectId),
            ]);
            toast.success(REQUIREMENT_MESSAGES.approval.approveSuccess);
          },
          onError: () => {
            toast.error(REQUIREMENT_MESSAGES.approval.approveError);
          },
        },
      },
    );
  const rejectMutation =
    useRejectRequirementApprovalProjectsProjectIdApprovalsApprovalIdRejectPost({
      mutation: {
        onSuccess: async () => {
          await Promise.all([
            invalidateRequirementApprovals(queryClient, projectId),
            invalidateRequirementChangeLogs(queryClient, projectId),
          ]);
          toast.success(REQUIREMENT_MESSAGES.approval.rejectSuccess);
        },
        onError: () => {
          toast.error(REQUIREMENT_MESSAGES.approval.rejectError);
        },
      },
    });

  const approveRequirementApproval = async (
    approvalId: number,
    comment?: string | null,
  ) => {
    await approveMutation.mutateAsync({
      projectId,
      approvalId,
      data: { comment: comment || null },
    });
  };

  const rejectRequirementApproval = async (
    approvalId: number,
    comment?: string | null,
  ) => {
    await rejectMutation.mutateAsync({
      projectId,
      approvalId,
      data: { comment: comment || null },
    });
  };

  return {
    approveRequirementApproval,
    rejectRequirementApproval,
    isPending: approveMutation.isPending || rejectMutation.isPending,
  };
}

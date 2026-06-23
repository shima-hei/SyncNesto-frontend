"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDeleteOpenIssueProjectsProjectIdOpenIssuesIssueIdDelete } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementChangeLogs,
  invalidateRequirementOpenIssues,
} from "../lib/requirement-cache";

export function useDeleteOpenIssue(projectId: number) {
  const queryClient = useQueryClient();
  const deleteOpenIssueMutation =
    useDeleteOpenIssueProjectsProjectIdOpenIssuesIssueIdDelete({
      mutation: {
        onSuccess: async () => {
          await Promise.all([
            invalidateRequirementOpenIssues(queryClient, projectId),
            invalidateRequirementChangeLogs(queryClient, projectId),
          ]);
          toast.success(REQUIREMENT_MESSAGES.openIssue.deleteSuccess);
        },
        onError: () => {
          toast.error(REQUIREMENT_MESSAGES.openIssue.deleteError);
        },
      },
    });

  const deleteOpenIssue = async (issueId: number) => {
    await deleteOpenIssueMutation.mutateAsync({
      projectId,
      issueId,
    });
  };

  return {
    deleteOpenIssue,
    isPending: deleteOpenIssueMutation.isPending,
    error: deleteOpenIssueMutation.error,
  };
}

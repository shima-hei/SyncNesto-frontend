"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useUpdateOpenIssueProjectsProjectIdOpenIssuesIssueIdPatch } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementChangeLogs,
  invalidateRequirementOpenIssues,
} from "../lib/requirement-cache";
import { toRequirementOpenIssueUpdate } from "../lib/requirement-mappers";
import type { RequirementOpenIssueFormValues } from "../types/requirement-open-issue-form";

export function useUpdateOpenIssue(projectId: number) {
  const queryClient = useQueryClient();
  const updateOpenIssueMutation =
    useUpdateOpenIssueProjectsProjectIdOpenIssuesIssueIdPatch({
      mutation: {
        onSuccess: async () => {
          await Promise.all([
            invalidateRequirementOpenIssues(queryClient, projectId),
            invalidateRequirementChangeLogs(queryClient, projectId),
          ]);
          toast.success(REQUIREMENT_MESSAGES.openIssue.updateSuccess);
        },
        onError: () => {
          toast.error(REQUIREMENT_MESSAGES.openIssue.updateError);
        },
      },
    });

  const updateOpenIssue = async (
    issueId: number,
    version: number,
    values: RequirementOpenIssueFormValues
  ) => {
    return updateOpenIssueMutation.mutateAsync({
      projectId,
      issueId,
      data: toRequirementOpenIssueUpdate(values, version),
    });
  };

  return {
    updateOpenIssue,
    isPending: updateOpenIssueMutation.isPending,
    error: updateOpenIssueMutation.error,
  };
}

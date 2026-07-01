"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCreateOpenIssueProjectsProjectIdOpenIssuesPost } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementChangeLogs,
  invalidateRequirementOpenIssues,
} from "../lib/requirement-cache";
import { toRequirementOpenIssueCreate } from "../lib/requirement-mappers";
import type { RequirementOpenIssueFormValues } from "../types/requirement-open-issue-form";

export function useCreateOpenIssue(projectId: number, documentId: number) {
  const queryClient = useQueryClient();
  const createOpenIssueMutation =
    useCreateOpenIssueProjectsProjectIdOpenIssuesPost({
      mutation: {
        onSuccess: async () => {
          await Promise.all([
            invalidateRequirementOpenIssues(queryClient, projectId),
            invalidateRequirementChangeLogs(queryClient, projectId),
          ]);
          toast.success(REQUIREMENT_MESSAGES.openIssue.createSuccess);
        },
        onError: () => {
          toast.error(REQUIREMENT_MESSAGES.openIssue.createError);
        },
      },
    });

  const createOpenIssue = async (values: RequirementOpenIssueFormValues) => {
    return createOpenIssueMutation.mutateAsync({
      projectId,
      data: toRequirementOpenIssueCreate(values, documentId),
    });
  };

  return {
    createOpenIssue,
    isPending: createOpenIssueMutation.isPending,
    error: createOpenIssueMutation.error,
  };
}

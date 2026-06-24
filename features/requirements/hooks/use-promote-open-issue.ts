"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { RequirementOpenIssueRead } from "@/lib/api/generated/model";
import { usePromoteOpenIssueToRequirementProjectsProjectIdOpenIssuesIssueIdPromoteToRequirementPost } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementChangeLogs,
  invalidateRequirementList,
  invalidateRequirementOpenIssues,
} from "../lib/requirement-cache";

export function usePromoteOpenIssue(projectId: number) {
  const queryClient = useQueryClient();
  const promoteOpenIssueMutation =
    usePromoteOpenIssueToRequirementProjectsProjectIdOpenIssuesIssueIdPromoteToRequirementPost(
      {
        mutation: {
          onSuccess: async () => {
            await Promise.all([
              invalidateRequirementOpenIssues(queryClient, projectId),
              invalidateRequirementList(queryClient, projectId),
              invalidateRequirementChangeLogs(queryClient, projectId),
            ]);
            toast.success(REQUIREMENT_MESSAGES.openIssue.promoteSuccess);
          },
          onError: () => {
            toast.error(REQUIREMENT_MESSAGES.openIssue.promoteError);
          },
        },
      }
    );

  const promoteOpenIssue = async (issue: RequirementOpenIssueRead) => {
    await promoteOpenIssueMutation.mutateAsync({
      projectId,
      issueId: issue.id,
      data: {
        version: issue.version,
        title: issue.title,
        description: issue.description,
        priority: "must",
        status: "draft",
        resolution: issue.resolution,
        reason: "未決事項から昇格",
      },
    });
  };

  return {
    promoteOpenIssue,
    isPending: promoteOpenIssueMutation.isPending,
    error: promoteOpenIssueMutation.error,
  };
}

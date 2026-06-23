"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useUpdateTargetCommentProjectsProjectIdCommentsCommentIdPatch } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementChangeLogs,
  invalidateRequirementTargetComments,
} from "../lib/requirement-cache";
import { toRequirementTargetCommentUpdate } from "../lib/requirement-mappers";
import type { RequirementTargetCommentFormValues } from "../types/requirement-target-comment-form";

export function useUpdateTargetComment(
  projectId: number,
  targetType: string,
  targetId: number
) {
  const queryClient = useQueryClient();
  const updateCommentMutation =
    useUpdateTargetCommentProjectsProjectIdCommentsCommentIdPatch({
      mutation: {
        onSuccess: async () => {
          await Promise.all([
            invalidateRequirementTargetComments(
              queryClient,
              projectId,
              targetType,
              targetId
            ),
            invalidateRequirementChangeLogs(queryClient, projectId),
          ]);
          toast.success(REQUIREMENT_MESSAGES.targetComment.updateSuccess);
        },
        onError: () => {
          toast.error(REQUIREMENT_MESSAGES.targetComment.updateError);
        },
      },
    });

  const updateTargetComment = async (
    commentId: number,
    version: number,
    values: RequirementTargetCommentFormValues
  ) => {
    return updateCommentMutation.mutateAsync({
      projectId,
      commentId,
      data: toRequirementTargetCommentUpdate(values, version),
    });
  };

  return {
    updateTargetComment,
    isPending: updateCommentMutation.isPending,
    error: updateCommentMutation.error,
  };
}

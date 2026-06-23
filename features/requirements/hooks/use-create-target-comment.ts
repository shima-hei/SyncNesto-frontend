"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCreateTargetCommentProjectsProjectIdCommentsPost } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementChangeLogs,
  invalidateRequirementTargetComments,
} from "../lib/requirement-cache";
import { toRequirementTargetCommentCreate } from "../lib/requirement-mappers";
import type { RequirementTargetCommentFormValues } from "../types/requirement-target-comment-form";

export function useCreateTargetComment(
  projectId: number,
  targetType: string,
  targetId: number
) {
  const queryClient = useQueryClient();
  const createCommentMutation =
    useCreateTargetCommentProjectsProjectIdCommentsPost({
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
          toast.success(REQUIREMENT_MESSAGES.targetComment.createSuccess);
        },
        onError: () => {
          toast.error(REQUIREMENT_MESSAGES.targetComment.createError);
        },
      },
    });

  const createTargetComment = async (
    values: RequirementTargetCommentFormValues,
    parentCommentId?: number | null
  ) => {
    return createCommentMutation.mutateAsync({
      projectId,
      data: toRequirementTargetCommentCreate(
        values,
        targetType,
        targetId,
        parentCommentId
      ),
    });
  };

  return {
    createTargetComment,
    isPending: createCommentMutation.isPending,
    error: createCommentMutation.error,
  };
}

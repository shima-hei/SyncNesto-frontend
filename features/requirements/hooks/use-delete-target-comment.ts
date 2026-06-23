"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDeleteTargetCommentProjectsProjectIdCommentsCommentIdDelete } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementChangeLogs,
  invalidateRequirementTargetComments,
} from "../lib/requirement-cache";

export function useDeleteTargetComment(
  projectId: number,
  targetType: string,
  targetId: number
) {
  const queryClient = useQueryClient();
  const deleteCommentMutation =
    useDeleteTargetCommentProjectsProjectIdCommentsCommentIdDelete({
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
          toast.success(REQUIREMENT_MESSAGES.targetComment.deleteSuccess);
        },
        onError: () => {
          toast.error(REQUIREMENT_MESSAGES.targetComment.deleteError);
        },
      },
    });

  const deleteTargetComment = async (commentId: number) => {
    await deleteCommentMutation.mutateAsync({
      projectId,
      commentId,
    });
  };

  return {
    deleteTargetComment,
    isPending: deleteCommentMutation.isPending,
    error: deleteCommentMutation.error,
  };
}

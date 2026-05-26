"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDeleteRequirementCommentProjectsProjectIdRequirementsRequirementIdCommentsCommentIdDelete } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import { invalidateRequirementCommentsWithSummary } from "../lib/requirement-cache";

export function useDeleteRequirementComment(
  projectId: number,
  requirementId: number
) {
  const queryClient = useQueryClient();
  const deleteCommentMutation =
    useDeleteRequirementCommentProjectsProjectIdRequirementsRequirementIdCommentsCommentIdDelete(
      {
        mutation: {
          onSuccess: async () => {
            await invalidateRequirementCommentsWithSummary(
              queryClient,
              projectId,
              requirementId
            );
            toast.success(REQUIREMENT_MESSAGES.comment.deleteSuccess);
          },
          onError: () => {
            toast.error(REQUIREMENT_MESSAGES.comment.deleteError);
          },
        },
      }
    );

  const deleteRequirementComment = async (commentId: number) => {
    await deleteCommentMutation.mutateAsync({
      projectId,
      requirementId,
      commentId,
    });
  };

  return {
    deleteRequirementComment,
    isPending: deleteCommentMutation.isPending,
    error: deleteCommentMutation.error,
  };
}

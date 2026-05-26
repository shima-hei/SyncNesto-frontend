"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDeleteRequirementReviewProjectsProjectIdRequirementsRequirementIdReviewsReviewIdDelete } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import { invalidateRequirementReviewsWithSummary } from "../lib/requirement-cache";

export function useDeleteRequirementReview(
  projectId: number,
  requirementId: number
) {
  const queryClient = useQueryClient();
  const deleteReviewMutation =
    useDeleteRequirementReviewProjectsProjectIdRequirementsRequirementIdReviewsReviewIdDelete(
      {
        mutation: {
          onSuccess: async () => {
            await invalidateRequirementReviewsWithSummary(
              queryClient,
              projectId,
              requirementId
            );
            toast.success(REQUIREMENT_MESSAGES.review.deleteSuccess);
          },
          onError: () => {
            toast.error(REQUIREMENT_MESSAGES.review.deleteError);
          },
        },
      }
    );

  const deleteRequirementReview = async (reviewId: number) => {
    await deleteReviewMutation.mutateAsync({
      projectId,
      requirementId,
      reviewId,
    });
  };

  return {
    deleteRequirementReview,
    isPending: deleteReviewMutation.isPending,
    error: deleteReviewMutation.error,
  };
}

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  useUpdateRequirementReviewProjectsProjectIdRequirementsRequirementIdReviewsReviewIdPatch,
} from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import { invalidateRequirementReviewsWithSummary } from "../lib/requirement-cache";
import { toRequirementReviewUpdate } from "../lib/requirement-mappers";
import type { RequirementReviewFormValues } from "../types/requirement-review-form";

export function useUpdateRequirementReview(
  projectId: number,
  requirementId: number
) {
  const queryClient = useQueryClient();
  const updateReviewMutation =
    useUpdateRequirementReviewProjectsProjectIdRequirementsRequirementIdReviewsReviewIdPatch(
      {
        mutation: {
          onSuccess: async () => {
            await invalidateRequirementReviewsWithSummary(
              queryClient,
              projectId,
              requirementId
            );
            toast.success(REQUIREMENT_MESSAGES.review.updateSuccess);
          },
          onError: () => {
            toast.error(REQUIREMENT_MESSAGES.review.updateError);
          },
        },
      }
    );

  const updateRequirementReview = async (
    reviewId: number,
    values: RequirementReviewFormValues
  ) => {
    return updateReviewMutation.mutateAsync({
      projectId,
      requirementId,
      reviewId,
      data: toRequirementReviewUpdate(values),
    });
  };

  return {
    updateRequirementReview,
    isPending: updateReviewMutation.isPending,
    error: updateReviewMutation.error,
  };
}

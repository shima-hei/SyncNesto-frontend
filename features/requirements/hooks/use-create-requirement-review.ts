"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  useCreateRequirementReviewProjectsProjectIdRequirementsRequirementIdReviewsPost,
} from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import { invalidateRequirementReviewsWithSummary } from "../lib/requirement-cache";
import { toRequirementReviewCreate } from "../lib/requirement-mappers";
import type { RequirementReviewFormValues } from "../types/requirement-review-form";

export function useCreateRequirementReview(
  projectId: number,
  requirementId: number
) {
  const queryClient = useQueryClient();
  const createReviewMutation =
    useCreateRequirementReviewProjectsProjectIdRequirementsRequirementIdReviewsPost(
      {
        mutation: {
          onSuccess: async () => {
            await invalidateRequirementReviewsWithSummary(
              queryClient,
              projectId,
              requirementId
            );
            toast.success(REQUIREMENT_MESSAGES.review.createSuccess);
          },
          onError: () => {
            toast.error(REQUIREMENT_MESSAGES.review.createError);
          },
        },
      }
    );

  const createRequirementReview = async (values: RequirementReviewFormValues) => {
    return createReviewMutation.mutateAsync({
      projectId,
      requirementId,
      data: toRequirementReviewCreate(values),
    });
  };

  return {
    createRequirementReview,
    isPending: createReviewMutation.isPending,
    error: createReviewMutation.error,
  };
}

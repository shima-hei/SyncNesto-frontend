"use client";

import { useListRequirementReviewsProjectsProjectIdRequirementsRequirementIdReviewsGet } from "@/lib/api/generated/requirements/requirements";

export function useRequirementReviews(projectId: number, requirementId: number) {
  const reviewsQuery =
    useListRequirementReviewsProjectsProjectIdRequirementsRequirementIdReviewsGet(
      projectId,
      requirementId,
      {
        query: {
          retry: false,
        },
      }
    );

  return {
    reviews: reviewsQuery.data ?? [],
    isLoading: reviewsQuery.isLoading,
    error: reviewsQuery.error,
  };
}

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { RequirementReviewUpdate } from "@/lib/api/generated/model";
import {
  getListRequirementReviewsProjectsProjectIdRequirementsRequirementIdReviewsGetQueryKey,
  getReadRequirementSummaryProjectsProjectIdRequirementsRequirementIdSummaryGetQueryKey,
  useUpdateRequirementReviewProjectsProjectIdRequirementsRequirementIdReviewsReviewIdPatch,
} from "@/lib/api/generated/requirements/requirements";

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
            // 要件詳細summaryにもレビュー情報が含まれるため、一覧とsummaryを一緒に更新する。
            await Promise.all([
              queryClient.invalidateQueries({
                queryKey:
                  getListRequirementReviewsProjectsProjectIdRequirementsRequirementIdReviewsGetQueryKey(
                    projectId,
                    requirementId
                  ),
              }),
              queryClient.invalidateQueries({
                queryKey:
                  getReadRequirementSummaryProjectsProjectIdRequirementsRequirementIdSummaryGetQueryKey(
                    projectId,
                    requirementId
                  ),
              }),
            ]);
            toast.success("レビューを更新しました。");
          },
          onError: () => {
            toast.error("レビューの更新に失敗しました。");
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

const toRequirementReviewUpdate = (
  values: RequirementReviewFormValues
): RequirementReviewUpdate => {
  return {
    reviewer_id: Number(values.reviewerId),
    status: values.status,
    comment: values.comment || null,
    reviewed_at: values.reviewedAt || null,
  };
};

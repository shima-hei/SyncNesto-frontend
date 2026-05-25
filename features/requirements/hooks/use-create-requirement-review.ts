"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { RequirementReviewCreate } from "@/lib/api/generated/model";
import {
  getListRequirementReviewsProjectsProjectIdRequirementsRequirementIdReviewsGetQueryKey,
  getReadRequirementSummaryProjectsProjectIdRequirementsRequirementIdSummaryGetQueryKey,
  useCreateRequirementReviewProjectsProjectIdRequirementsRequirementIdReviewsPost,
} from "@/lib/api/generated/requirements/requirements";

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
            // 要件詳細summaryにもレビュー件数が含まれるため、一覧とsummaryを一緒に更新する。
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
            toast.success("レビューを追加しました。");
          },
          onError: () => {
            toast.error("レビューの追加に失敗しました。");
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

const toRequirementReviewCreate = (
  values: RequirementReviewFormValues
): RequirementReviewCreate => {
  return {
    reviewer_id: Number(values.reviewerId),
    status: values.status,
    comment: values.comment || null,
    reviewed_at: values.reviewedAt || null,
  };
};

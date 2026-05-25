"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getListRequirementReviewsProjectsProjectIdRequirementsRequirementIdReviewsGetQueryKey,
  getReadRequirementSummaryProjectsProjectIdRequirementsRequirementIdSummaryGetQueryKey,
  useDeleteRequirementReviewProjectsProjectIdRequirementsRequirementIdReviewsReviewIdDelete,
} from "@/lib/api/generated/requirements/requirements";

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
            toast.success("レビューを削除しました。");
          },
          onError: () => {
            toast.error("レビューの削除に失敗しました。");
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

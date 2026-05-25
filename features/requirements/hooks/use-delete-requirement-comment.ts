"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getListRequirementCommentsProjectsProjectIdRequirementsRequirementIdCommentsGetQueryKey,
  getReadRequirementSummaryProjectsProjectIdRequirementsRequirementIdSummaryGetQueryKey,
  useDeleteRequirementCommentProjectsProjectIdRequirementsRequirementIdCommentsCommentIdDelete,
} from "@/lib/api/generated/requirements/requirements";

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
            // 要件詳細summaryにもコメント件数が含まれるため、一覧とsummaryを一緒に更新する。
            await Promise.all([
              queryClient.invalidateQueries({
                queryKey:
                  getListRequirementCommentsProjectsProjectIdRequirementsRequirementIdCommentsGetQueryKey(
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
            toast.success("コメントを削除しました。");
          },
          onError: () => {
            toast.error("コメントの削除に失敗しました。");
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

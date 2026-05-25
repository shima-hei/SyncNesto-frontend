"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { RequirementCommentCreate } from "@/lib/api/generated/model";
import {
  getListRequirementCommentsProjectsProjectIdRequirementsRequirementIdCommentsGetQueryKey,
  getReadRequirementSummaryProjectsProjectIdRequirementsRequirementIdSummaryGetQueryKey,
  useCreateRequirementCommentProjectsProjectIdRequirementsRequirementIdCommentsPost,
} from "@/lib/api/generated/requirements/requirements";

import type { RequirementCommentFormValues } from "../types/requirement-comment-form";

export function useCreateRequirementComment(
  projectId: number,
  requirementId: number
) {
  const queryClient = useQueryClient();
  const createCommentMutation =
    useCreateRequirementCommentProjectsProjectIdRequirementsRequirementIdCommentsPost(
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
            toast.success("コメントを追加しました。");
          },
          onError: () => {
            toast.error("コメントの追加に失敗しました。");
          },
        },
      }
    );

  const createRequirementComment = async (
    values: RequirementCommentFormValues
  ) => {
    return createCommentMutation.mutateAsync({
      projectId,
      requirementId,
      data: toRequirementCommentCreate(values),
    });
  };

  return {
    createRequirementComment,
    isPending: createCommentMutation.isPending,
    error: createCommentMutation.error,
  };
}

const toRequirementCommentCreate = (
  values: RequirementCommentFormValues
): RequirementCommentCreate => {
  return {
    comment: values.comment,
  };
};

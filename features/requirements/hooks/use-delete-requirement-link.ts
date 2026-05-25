"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getListRequirementLinksProjectsProjectIdRequirementsRequirementIdLinksGetQueryKey,
  getReadRequirementSummaryProjectsProjectIdRequirementsRequirementIdSummaryGetQueryKey,
  useDeleteRequirementLinkProjectsProjectIdRequirementsRequirementIdLinksLinkIdDelete,
} from "@/lib/api/generated/requirements/requirements";

export function useDeleteRequirementLink(
  projectId: number,
  requirementId: number
) {
  const queryClient = useQueryClient();
  const deleteLinkMutation =
    useDeleteRequirementLinkProjectsProjectIdRequirementsRequirementIdLinksLinkIdDelete(
      {
        mutation: {
          onSuccess: async () => {
            // 要件詳細summaryにもリンク件数が含まれるため、一覧とsummaryを一緒に更新する。
            await Promise.all([
              queryClient.invalidateQueries({
                queryKey:
                  getListRequirementLinksProjectsProjectIdRequirementsRequirementIdLinksGetQueryKey(
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
            toast.success("関連成果物を削除しました。");
          },
          onError: () => {
            toast.error("関連成果物の削除に失敗しました。");
          },
        },
      }
    );

  const deleteRequirementLink = async (linkId: number) => {
    await deleteLinkMutation.mutateAsync({
      projectId,
      requirementId,
      linkId,
    });
  };

  return {
    deleteRequirementLink,
    isPending: deleteLinkMutation.isPending,
    error: deleteLinkMutation.error,
  };
}

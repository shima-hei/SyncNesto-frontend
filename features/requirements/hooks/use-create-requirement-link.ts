"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { RequirementLinkCreate } from "@/lib/api/generated/model";
import {
  getListRequirementLinksProjectsProjectIdRequirementsRequirementIdLinksGetQueryKey,
  getReadRequirementSummaryProjectsProjectIdRequirementsRequirementIdSummaryGetQueryKey,
  useCreateRequirementLinkProjectsProjectIdRequirementsRequirementIdLinksPost,
} from "@/lib/api/generated/requirements/requirements";

import type { RequirementLinkFormValues } from "../types/requirement-link-form";

export function useCreateRequirementLink(
  projectId: number,
  requirementId: number
) {
  const queryClient = useQueryClient();
  const createLinkMutation =
    useCreateRequirementLinkProjectsProjectIdRequirementsRequirementIdLinksPost({
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
          toast.success("関連成果物を追加しました。");
        },
        onError: () => {
          toast.error("関連成果物の追加に失敗しました。");
        },
      },
    });

  const createRequirementLink = async (values: RequirementLinkFormValues) => {
    return createLinkMutation.mutateAsync({
      projectId,
      requirementId,
      data: toRequirementLinkCreate(values),
    });
  };

  return {
    createRequirementLink,
    isPending: createLinkMutation.isPending,
    error: createLinkMutation.error,
  };
}

const toRequirementLinkCreate = (
  values: RequirementLinkFormValues
): RequirementLinkCreate => {
  return {
    linked_type: values.linkedType,
    linked_id: values.linkedId,
  };
};

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useUpdateRequirementSectionProjectsProjectIdRequirementSectionsSectionIdPatch } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import { isVersionConflictError } from "@/lib/api/conflict";
import {
  invalidateRequirementChangeLogs,
  invalidateRequirementSections,
} from "../lib/requirement-cache";
import { toRequirementSectionUpdate } from "../lib/requirement-mappers";
import type { RequirementSectionFormValues } from "../types/requirement-section-form";

export function useUpdateRequirementSection(
  projectId: number,
  documentId: number,
) {
  const queryClient = useQueryClient();
  const updateSectionMutation =
    useUpdateRequirementSectionProjectsProjectIdRequirementSectionsSectionIdPatch(
      {
        mutation: {
          onSuccess: async () => {
            await Promise.all([
              invalidateRequirementSections(queryClient, projectId, documentId),
              invalidateRequirementChangeLogs(queryClient, projectId),
            ]);
            toast.success(REQUIREMENT_MESSAGES.section.updateSuccess);
          },
          onError: () => {
            toast.error(REQUIREMENT_MESSAGES.section.updateError);
          },
        },
      },
    );

  const updateRequirementSection = async (
    sectionId: number,
    version: number,
    values: RequirementSectionFormValues,
  ) => {
    return updateSectionMutation.mutateAsync({
      projectId,
      sectionId,
      data: toRequirementSectionUpdate(values, version),
    });
  };

  return {
    updateRequirementSection,
    updateRequirementSectionContent: async (
      sectionId: number,
      version: number,
      content: string,
    ) => {
      try {
        return await updateSectionMutation.mutateAsync({
          projectId,
          sectionId,
          data: { version, content: content || null },
        });
      } catch (error) {
        if (isVersionConflictError(error)) {
          // 比較用の保存済み本文だけを更新し、入力と編集開始版は保持する。
          await invalidateRequirementSections(
            queryClient,
            projectId,
            documentId,
          );
        }
        throw error;
      }
    },
    isPending: updateSectionMutation.isPending,
    error: updateSectionMutation.error,
  };
}

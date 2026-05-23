"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getConflictCurrent } from "@/lib/api/conflict";
import type { RequirementRead, RequirementUpdate } from "@/lib/api/generated/model";
import {
  getListRequirementsProjectsProjectIdRequirementsGetQueryKey,
  getReadRequirementProjectsProjectIdRequirementsRequirementIdGetQueryKey,
  getReadRequirementSummaryProjectsProjectIdRequirementsRequirementIdSummaryGetQueryKey,
  useUpdateRequirementProjectsProjectIdRequirementsRequirementIdPatch,
} from "@/lib/api/generated/requirements/requirements";

import { toOptionalNumber } from "../constants/requirement-form";
import type { RequirementFormValues } from "../types/requirement-form";

export function useUpdateRequirement(projectId: number, requirementId: number) {
  const queryClient = useQueryClient();
  const [conflictCurrent, setConflictCurrent] =
    useState<RequirementRead | null>(null);
  const updateRequirementMutation =
    useUpdateRequirementProjectsProjectIdRequirementsRequirementIdPatch({
      mutation: {
        onSuccess: async (requirement) => {
          setConflictCurrent(null);
          queryClient.setQueryData(
            getReadRequirementProjectsProjectIdRequirementsRequirementIdGetQueryKey(
              projectId,
              requirementId
            ),
            requirement
          );
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: getListRequirementsProjectsProjectIdRequirementsGetQueryKey(
                projectId
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
          toast.success("要件を更新しました。");
        },
        onError: (error) => {
          const current = getConflictCurrent<RequirementRead>(error);

          if (current) {
            setConflictCurrent(current);
            toast.error("他の更新と競合しました。");
            return;
          }

          toast.error("要件の更新に失敗しました。");
        },
      },
    });

  const updateRequirement = async (
    values: RequirementFormValues,
    version: number
  ) => {
    return updateRequirementMutation.mutateAsync({
      projectId,
      requirementId,
      data: toRequirementUpdate(values, version),
    });
  };

  const resetConflict = () => {
    setConflictCurrent(null);
  };

  return {
    updateRequirement,
    conflictCurrent,
    resetConflict,
    isConflict: Boolean(conflictCurrent),
    isPending: updateRequirementMutation.isPending,
    error: updateRequirementMutation.error,
  };
}

const toRequirementUpdate = (
  values: RequirementFormValues,
  version: number
): RequirementUpdate => {
  return {
    version,
    requirement_code: values.requirementCode,
    requirement_type: values.requirementType,
    category: values.category || null,
    title: values.title,
    description: values.description || null,
    rationale: values.rationale || null,
    acceptance_criteria: values.acceptanceCriteria || null,
    priority: values.priority,
    status: values.status,
    source: values.source || null,
    owner_id: toOptionalNumber(values.ownerId),
    approved_by: toOptionalNumber(values.approvedBy),
    approved_at: values.approvedAt || null,
    change_summary: values.changeSummary || null,
    reason: values.reason || null,
  };
};

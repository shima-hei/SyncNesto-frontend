"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getConflictCurrent } from "@/lib/api/conflict";
import type { RequirementRead } from "@/lib/api/generated/model";
import {
  useUpdateRequirementProjectsProjectIdRequirementsRequirementIdPatch,
} from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementList,
  invalidateRequirementSummary,
  setRequirementDetailCache,
} from "../lib/requirement-cache";
import { toRequirementUpdate } from "../lib/requirement-mappers";
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
          setRequirementDetailCache(
            queryClient,
            projectId,
            requirementId,
            requirement
          );
          await Promise.all([
            invalidateRequirementList(queryClient, projectId),
            invalidateRequirementSummary(queryClient, projectId, requirementId),
          ]);
          toast.success(REQUIREMENT_MESSAGES.requirement.updateSuccess);
        },
        onError: (error) => {
          const current = getConflictCurrent<RequirementRead>(error);

          if (current) {
            setConflictCurrent(current);
            toast.error(REQUIREMENT_MESSAGES.conflict);
            return;
          }

          toast.error(REQUIREMENT_MESSAGES.requirement.updateError);
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

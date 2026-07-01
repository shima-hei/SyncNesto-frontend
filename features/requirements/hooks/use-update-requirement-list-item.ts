"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  RequirementRead,
  RequirementUpdate,
} from "@/lib/api/generated/model";
import { useUpdateRequirementProjectsProjectIdRequirementsRequirementIdPatch } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementChangeLogs,
  invalidateRequirementList,
  invalidateRequirementSummary,
  setRequirementDetailCache,
} from "../lib/requirement-cache";

export function useUpdateRequirementListItem(projectId: number) {
  const queryClient = useQueryClient();
  const updateRequirementMutation =
    useUpdateRequirementProjectsProjectIdRequirementsRequirementIdPatch({
      mutation: {
        onSuccess: async (requirement) => {
          setRequirementDetailCache(
            queryClient,
            projectId,
            requirement.id,
            requirement,
          );
          await Promise.all([
            invalidateRequirementList(queryClient, projectId),
            invalidateRequirementSummary(
              queryClient,
              projectId,
              requirement.id,
            ),
            invalidateRequirementChangeLogs(queryClient, projectId),
          ]);
          toast.success(REQUIREMENT_MESSAGES.requirement.updateSuccess);
        },
        onError: () => {
          toast.error(REQUIREMENT_MESSAGES.requirement.updateError);
        },
      },
    });

  const updateRequirementListItem = async (
    requirement: RequirementRead,
    values: Omit<RequirementUpdate, "version">,
  ) => {
    return updateRequirementMutation.mutateAsync({
      projectId,
      requirementId: requirement.id,
      data: {
        version: requirement.version,
        ...values,
      },
    });
  };

  return {
    updateRequirementListItem,
    isPending: updateRequirementMutation.isPending,
  };
}

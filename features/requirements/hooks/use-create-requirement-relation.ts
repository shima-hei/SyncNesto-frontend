"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCreateRequirementRelationProjectsProjectIdRequirementsRequirementIdRelationsPost } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementChangeLogs,
  invalidateRequirementRelations,
} from "../lib/requirement-cache";
import { toRequirementRelationCreate } from "../lib/requirement-mappers";
import type { RequirementRelationFormValues } from "../types/requirement-relation-form";

export function useCreateRequirementRelation(
  projectId: number,
  requirementId: number,
) {
  const queryClient = useQueryClient();
  const createRelationMutation =
    useCreateRequirementRelationProjectsProjectIdRequirementsRequirementIdRelationsPost(
      {
        mutation: {
          onSuccess: async () => {
            await Promise.all([
              invalidateRequirementRelations(
                queryClient,
                projectId,
                requirementId,
              ),
              invalidateRequirementChangeLogs(queryClient, projectId),
            ]);
            toast.success(REQUIREMENT_MESSAGES.relation.createSuccess);
          },
          onError: () => {
            toast.error(REQUIREMENT_MESSAGES.relation.createError);
          },
        },
      },
    );

  const createRequirementRelation = async (
    values: RequirementRelationFormValues,
  ) => {
    return createRelationMutation.mutateAsync({
      projectId,
      requirementId,
      data: toRequirementRelationCreate(values),
    });
  };

  return {
    createRequirementRelation,
    isPending: createRelationMutation.isPending,
    error: createRelationMutation.error,
  };
}

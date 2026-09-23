"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDeleteRequirementRelationProjectsProjectIdRequirementsRequirementIdRelationsRelationIdDelete } from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementChangeLogs,
  invalidateRequirementRelations,
} from "../lib/requirement-cache";

export function useDeleteRequirementRelation(
  projectId: number,
  requirementId: number,
) {
  const queryClient = useQueryClient();
  const deleteRelationMutation =
    useDeleteRequirementRelationProjectsProjectIdRequirementsRequirementIdRelationsRelationIdDelete(
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
            toast.success(REQUIREMENT_MESSAGES.relation.deleteSuccess);
          },
          onError: () => {
            toast.error(REQUIREMENT_MESSAGES.relation.deleteError);
          },
        },
      },
    );

  const deleteRequirementRelation = async (relationId: number) => {
    await deleteRelationMutation.mutateAsync({
      projectId,
      requirementId,
      relationId,
    });
  };

  return {
    deleteRequirementRelation,
    isPending: deleteRelationMutation.isPending,
    error: deleteRelationMutation.error,
  };
}

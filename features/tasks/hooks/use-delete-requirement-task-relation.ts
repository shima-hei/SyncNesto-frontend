"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDeleteRequirementTaskRelationRequirementsRequirementIdTaskRelationsRelationIdDelete } from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import {
  invalidateRequirementTaskList,
  invalidateRequirementTaskProgress,
} from "../lib/task-cache";

export function useDeleteRequirementTaskRelation(requirementId: number) {
  const queryClient = useQueryClient();
  const deleteRelationMutation =
    useDeleteRequirementTaskRelationRequirementsRequirementIdTaskRelationsRelationIdDelete({
      mutation: {
        onSuccess: async () => {
          await Promise.all([
            invalidateRequirementTaskList(queryClient, requirementId),
            invalidateRequirementTaskProgress(queryClient, requirementId),
          ]);
          toast.success(TASK_MESSAGES.task.unlinkSuccess);
        },
        onError: () => {
          toast.error(TASK_MESSAGES.task.unlinkError);
        },
      },
    });

  const deleteRequirementTaskRelation = async (relationId: number) => {
    return deleteRelationMutation.mutateAsync({
      requirementId,
      relationId,
    });
  };

  return {
    deleteRequirementTaskRelation,
    isPending: deleteRelationMutation.isPending,
  };
}

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCreateRequirementTaskRelationRequirementsRequirementIdTaskRelationsPost } from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import {
  invalidateRequirementTaskList,
  invalidateRequirementTaskProgress,
} from "../lib/task-cache";

export function useCreateRequirementTaskRelation(requirementId: number) {
  const queryClient = useQueryClient();
  const mutation =
    useCreateRequirementTaskRelationRequirementsRequirementIdTaskRelationsPost({
      mutation: {
        onSuccess: async () => {
          await Promise.all([
            invalidateRequirementTaskList(queryClient, requirementId),
            invalidateRequirementTaskProgress(queryClient, requirementId),
          ]);
          toast.success(TASK_MESSAGES.task.linkSuccess);
        },
        onError: () => {
          toast.error(TASK_MESSAGES.task.linkError);
        },
      },
    });

  const createRequirementTaskRelation = async (
    taskId: number,
    relationType: string
  ) => {
    return mutation.mutateAsync({
      requirementId,
      data: {
        task_id: taskId,
        relation_type: relationType,
      },
    });
  };

  return {
    createRequirementTaskRelation,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

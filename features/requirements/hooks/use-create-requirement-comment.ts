"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  useCreateRequirementCommentProjectsProjectIdRequirementsRequirementIdCommentsPost,
} from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import { invalidateRequirementCommentsWithSummary } from "../lib/requirement-cache";
import { toRequirementCommentCreate } from "../lib/requirement-mappers";
import type { RequirementCommentFormValues } from "../types/requirement-comment-form";

export function useCreateRequirementComment(
  projectId: number,
  requirementId: number
) {
  const queryClient = useQueryClient();
  const createCommentMutation =
    useCreateRequirementCommentProjectsProjectIdRequirementsRequirementIdCommentsPost(
      {
        mutation: {
          onSuccess: async () => {
            await invalidateRequirementCommentsWithSummary(
              queryClient,
              projectId,
              requirementId
            );
            toast.success(REQUIREMENT_MESSAGES.comment.createSuccess);
          },
          onError: () => {
            toast.error(REQUIREMENT_MESSAGES.comment.createError);
          },
        },
      }
    );

  const createRequirementComment = async (
    values: RequirementCommentFormValues
  ) => {
    return createCommentMutation.mutateAsync({
      projectId,
      requirementId,
      data: toRequirementCommentCreate(values),
    });
  };

  return {
    createRequirementComment,
    isPending: createCommentMutation.isPending,
    error: createCommentMutation.error,
  };
}

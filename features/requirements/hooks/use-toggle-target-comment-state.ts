"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  useReopenTargetCommentProjectsProjectIdCommentsCommentIdReopenPost,
  useResolveTargetCommentProjectsProjectIdCommentsCommentIdResolvePost,
} from "@/lib/api/generated/requirements/requirements";

import { REQUIREMENT_MESSAGES } from "../constants/requirement-messages";
import {
  invalidateRequirementChangeLogs,
  invalidateRequirementTargetComments,
} from "../lib/requirement-cache";

export function useToggleTargetCommentState(
  projectId: number,
  targetType: string,
  targetId: number
) {
  const queryClient = useQueryClient();
  const resolveMutation =
    useResolveTargetCommentProjectsProjectIdCommentsCommentIdResolvePost({
      mutation: {
        onSuccess: async () => {
          await invalidateComments(queryClient, projectId, targetType, targetId);
          toast.success(REQUIREMENT_MESSAGES.targetComment.resolveSuccess);
        },
        onError: () => {
          toast.error(REQUIREMENT_MESSAGES.targetComment.resolveError);
        },
      },
    });
  const reopenMutation =
    useReopenTargetCommentProjectsProjectIdCommentsCommentIdReopenPost({
      mutation: {
        onSuccess: async () => {
          await invalidateComments(queryClient, projectId, targetType, targetId);
          toast.success(REQUIREMENT_MESSAGES.targetComment.reopenSuccess);
        },
        onError: () => {
          toast.error(REQUIREMENT_MESSAGES.targetComment.reopenError);
        },
      },
    });

  const resolveTargetComment = async (commentId: number, version: number) => {
    await resolveMutation.mutateAsync({
      projectId,
      commentId,
      data: { version },
    });
  };

  const reopenTargetComment = async (commentId: number, version: number) => {
    await reopenMutation.mutateAsync({
      projectId,
      commentId,
      data: { version },
    });
  };

  return {
    resolveTargetComment,
    reopenTargetComment,
    isPending: resolveMutation.isPending || reopenMutation.isPending,
  };
}

const invalidateComments = (
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: number,
  targetType: string,
  targetId: number
) => {
  return Promise.all([
    invalidateRequirementTargetComments(
      queryClient,
      projectId,
      targetType,
      targetId
    ),
    invalidateRequirementChangeLogs(queryClient, projectId),
  ]);
};

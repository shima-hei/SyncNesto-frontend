"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  useReopenTaskCommentTaskCommentsCommentIdReopenPost,
  useResolveTaskCommentTaskCommentsCommentIdResolvePost,
} from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import {
  invalidateTaskChangeLogs,
  invalidateTaskComments,
} from "../lib/task-cache";

export function useToggleTaskCommentState(taskId: number) {
  const queryClient = useQueryClient();
  const resolveMutation = useResolveTaskCommentTaskCommentsCommentIdResolvePost(
    {
      mutation: {
        onSuccess: async () => {
          await invalidateComments(queryClient, taskId);
          toast.success(TASK_MESSAGES.comment.resolveSuccess);
        },
        onError: () => {
          toast.error(TASK_MESSAGES.comment.resolveError);
        },
      },
    },
  );
  const reopenMutation = useReopenTaskCommentTaskCommentsCommentIdReopenPost({
    mutation: {
      onSuccess: async () => {
        await invalidateComments(queryClient, taskId);
        toast.success(TASK_MESSAGES.comment.reopenSuccess);
      },
      onError: () => {
        toast.error(TASK_MESSAGES.comment.reopenError);
      },
    },
  });

  const resolveTaskComment = async (commentId: number, version: number) => {
    await resolveMutation.mutateAsync({
      commentId,
      data: { version },
    });
  };

  const reopenTaskComment = async (commentId: number, version: number) => {
    await reopenMutation.mutateAsync({
      commentId,
      data: { version },
    });
  };

  return {
    resolveTaskComment,
    reopenTaskComment,
    isPending: resolveMutation.isPending || reopenMutation.isPending,
  };
}

const invalidateComments = (
  queryClient: ReturnType<typeof useQueryClient>,
  taskId: number,
) => {
  return Promise.all([
    invalidateTaskComments(queryClient, taskId),
    invalidateTaskChangeLogs(queryClient, taskId),
  ]);
};

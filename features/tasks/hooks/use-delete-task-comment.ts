"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDeleteTaskCommentTaskCommentsCommentIdDelete } from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import {
  invalidateTaskChangeLogs,
  invalidateTaskComments,
} from "../lib/task-cache";

export function useDeleteTaskComment(taskId: number) {
  const queryClient = useQueryClient();
  const deleteCommentMutation = useDeleteTaskCommentTaskCommentsCommentIdDelete(
    {
      mutation: {
        onSuccess: async () => {
          await Promise.all([
            invalidateTaskComments(queryClient, taskId),
            invalidateTaskChangeLogs(queryClient, taskId),
          ]);
          toast.success(TASK_MESSAGES.comment.deleteSuccess);
        },
        onError: () => {
          toast.error(TASK_MESSAGES.comment.deleteError);
        },
      },
    },
  );

  const deleteTaskComment = async (commentId: number) => {
    return deleteCommentMutation.mutateAsync({ commentId });
  };

  return {
    deleteTaskComment,
    isPending: deleteCommentMutation.isPending,
  };
}

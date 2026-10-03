"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useUpdateTaskCommentTaskCommentsCommentIdPatch } from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import {
  invalidateTaskChangeLogs,
  invalidateTaskComments,
} from "../lib/task-cache";
import type { TaskCommentFormValues } from "../types/task-comment-form";

export function useUpdateTaskComment(taskId: number) {
  const queryClient = useQueryClient();
  const updateCommentMutation = useUpdateTaskCommentTaskCommentsCommentIdPatch({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          invalidateTaskComments(queryClient, taskId),
          invalidateTaskChangeLogs(queryClient, taskId),
        ]);
        toast.success(TASK_MESSAGES.comment.updateSuccess);
      },
      onError: () => {
        toast.error(TASK_MESSAGES.comment.updateError);
      },
    },
  });

  const updateTaskComment = async (
    commentId: number,
    version: number,
    values: TaskCommentFormValues,
  ) => {
    return updateCommentMutation.mutateAsync({
      commentId,
      data: {
        version,
        body: values.body,
        mentions: values.mentions ?? [],
      },
    });
  };

  return {
    updateTaskComment,
    isPending: updateCommentMutation.isPending,
    error: updateCommentMutation.error,
  };
}

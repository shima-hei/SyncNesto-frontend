"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCreateTaskCommentTasksTaskIdCommentsPost } from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import {
  invalidateTaskChangeLogs,
  invalidateTaskComments,
} from "../lib/task-cache";
import type { TaskCommentFormValues } from "../types/task-comment-form";

export function useCreateTaskComment(taskId: number) {
  const queryClient = useQueryClient();
  const createCommentMutation = useCreateTaskCommentTasksTaskIdCommentsPost({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          invalidateTaskComments(queryClient, taskId),
          invalidateTaskChangeLogs(queryClient, taskId),
        ]);
        toast.success(TASK_MESSAGES.comment.createSuccess);
      },
      onError: () => {
        toast.error(TASK_MESSAGES.comment.createError);
      },
    },
  });

  const createTaskComment = async (
    values: TaskCommentFormValues,
    parentCommentId?: number | null,
  ) => {
    return createCommentMutation.mutateAsync({
      taskId,
      data: {
        parent_comment_id: parentCommentId ?? null,
        body: values.body.trim(),
      },
    });
  };

  return {
    createTaskComment,
    isPending: createCommentMutation.isPending,
    error: createCommentMutation.error,
  };
}

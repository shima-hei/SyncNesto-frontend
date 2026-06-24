"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { TaskRead } from "@/lib/api/generated/model";
import {
  useMoveTaskBoardsBoardIdTasksTaskIdMovePost,
  useUpdateTaskTasksTaskIdPatch,
} from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import {
  invalidateBoardList,
  invalidateGantt,
  invalidateTaskList,
  setTaskDetailCache,
} from "../lib/task-cache";

type TaskStatusUpdateOptions = {
  boardId?: number | null;
  sortOrder?: number;
};

export function useUpdateTaskStatus(projectId: number) {
  const queryClient = useQueryClient();
  const handleSuccess = async (task: TaskRead) => {
    setTaskDetailCache(queryClient, task.id, task);
    await Promise.all([
      invalidateTaskList(queryClient, projectId),
      invalidateGantt(queryClient, projectId),
      invalidateBoardList(queryClient, projectId),
    ]);
    toast.success(TASK_MESSAGES.task.statusUpdateSuccess);
  };
  const handleError = () => {
    toast.error(TASK_MESSAGES.task.statusUpdateError);
  };
  const updateTaskMutation = useUpdateTaskTasksTaskIdPatch({
    mutation: {
      onSuccess: handleSuccess,
      onError: handleError,
    },
  });
  const moveTaskMutation = useMoveTaskBoardsBoardIdTasksTaskIdMovePost({
    mutation: {
      onSuccess: handleSuccess,
      onError: handleError,
    },
  });

  const updateTaskStatus = async (
    task: TaskRead,
    status: string,
    options: TaskStatusUpdateOptions = {}
  ) => {
    if (options.boardId) {
      return moveTaskMutation.mutateAsync({
        boardId: options.boardId,
        taskId: task.id,
        data: {
          status,
          sort_order: options.sortOrder ?? task.sort_order ?? 0,
          version: task.version,
        },
      });
    }

    return updateTaskMutation.mutateAsync({
      taskId: task.id,
      data: {
        version: task.version,
        status,
      },
    });
  };

  return {
    updateTaskStatus,
    isPending: updateTaskMutation.isPending || moveTaskMutation.isPending,
  };
}

"use client";

import { useEffect, useRef, useState } from "react";
import { TaskReturnReasonDialog } from "../components/shared/task-return-reason-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { TaskRead } from "@/lib/api/generated/model";
import {
  useMoveTaskBoardsBoardIdTasksTaskIdMovePost,
  useUpdateTaskTasksTaskIdPatch,
} from "@/lib/api/generated/tasks/tasks";

import { TASK_MESSAGES } from "../constants/task-messages";
import {
  invalidateTaskProjectSurfaces,
  setTaskDetailCache,
} from "../lib/task-cache";

type TaskStatusUpdateOptions = {
  boardId?: number | null;
  sortOrder?: number;
  changeReason?: string;
};

export function useUpdateTaskStatus(projectId: number) {
  const [returnTask, setReturnTask] = useState<TaskRead | null>(null);
  const resolveReason = useRef<((reason: string | null) => void) | null>(null);
  const [lastReason, setLastReason] = useState<{
    taskId: number;
    value: string;
  } | null>(null);
  useEffect(
    () => () => {
      resolveReason.current?.(null);
    },
    [],
  );
  const queryClient = useQueryClient();
  const handleSuccess = async (task: TaskRead) => {
    setTaskDetailCache(queryClient, task.id, task);
    await invalidateTaskProjectSurfaces(queryClient, projectId, {
      includeBoard: true,
    });
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
    options: TaskStatusUpdateOptions = {},
  ) => {
    let changeReason = options.changeReason?.trim();
    if (status === "returned" && task.status !== "returned" && !changeReason) {
      if (resolveReason.current) return task;
      const reason = await new Promise<string | null>((resolve) => {
        resolveReason.current = resolve;
        setReturnTask(task);
      });
      if (!reason) return task;
      changeReason = reason;
    }
    if (options.boardId) {
      return moveTaskMutation.mutateAsync({
        boardId: options.boardId,
        taskId: task.id,
        data: {
          status,
          sort_order: options.sortOrder ?? task.sort_order ?? 0,
          version: task.version,
          ...(changeReason ? { change_reason: changeReason } : {}),
        },
      });
    }

    return updateTaskMutation.mutateAsync({
      taskId: task.id,
      data: {
        version: task.version,
        status,
        ...(changeReason ? { change_reason: changeReason } : {}),
        ...(status === "done" ? { progress_percent: 100 } : {}),
      },
    });
  };

  return {
    updateTaskStatus,
    returnDialog: returnTask ? (
      <TaskReturnReasonDialog
        title={returnTask.title}
        initialReason={
          lastReason?.taskId === returnTask.id ? lastReason.value : ""
        }
        onDone={(reason: string | null) => {
          if (reason) setLastReason({ taskId: returnTask.id, value: reason });
          const resolve = resolveReason.current;
          resolveReason.current = null;
          setReturnTask(null);
          resolve?.(reason);
        }}
      />
    ) : null,
    isPending:
      Boolean(returnTask) ||
      updateTaskMutation.isPending ||
      moveTaskMutation.isPending,
  };
}

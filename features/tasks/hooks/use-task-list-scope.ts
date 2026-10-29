"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useReadTaskTasksTaskIdGet } from "@/lib/api/generated/tasks/tasks";
import {
  getTaskListScopeQuery,
  readTaskListScope,
  resolveTaskReference,
  setTaskListScopeParams,
  type TaskListScope,
} from "../lib/task-list-scope";

export function useTaskListScope(projectId: number, enabled: boolean) {
  const params = useSearchParams();
  const scope = readTaskListScope(params);
  const parentId = scope.kind === "children" ? scope.parentTaskId : null;
  const parentQuery = useReadTaskTasksTaskIdGet(parentId ?? 0, {
    query: { enabled: enabled && parentId !== null, retry: false },
  });
  const parent = parentQuery.data;
  const parentTask = parentQuery.error
    ? null
    : resolveTaskReference(projectId, parentId, [parent]);
  const setScope = useCallback((next: TaskListScope) => {
    const url = new URL(window.location.href);
    setTaskListScopeParams(url.searchParams, next);
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);
  return {
    scope,
    query: getTaskListScopeQuery(scope),
    parentTask,
    isParentLoading: parentQuery.isFetching && !parentTask,
    parentUnavailable: Boolean(
      parentId && !parentQuery.isPending && !parentTask,
    ),
    retryParent: () => void parentQuery.refetch(),
    setScope,
  };
}

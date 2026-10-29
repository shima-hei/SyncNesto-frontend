"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useReadTaskTasksTaskIdGet } from "@/lib/api/generated/tasks/tasks";
import { readTaskHierarchyFilter } from "../lib/task-list-filters";
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
  const hierarchy = readTaskHierarchyFilter(params.get("hierarchy"));
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
  const setHierarchy = useCallback((value: string) => {
    const url = new URL(window.location.href);
    const next = readTaskHierarchyFilter(value);
    url.searchParams.delete("page");
    if (next === "all") url.searchParams.delete("hierarchy");
    else url.searchParams.set("hierarchy", next);
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);
  return {
    scope,
    hierarchy,
    query: {
      ...getTaskListScopeQuery(scope),
      hierarchy: hierarchy === "all" ? undefined : hierarchy,
    },
    parentTask,
    isParentLoading: parentQuery.isFetching && !parentTask,
    parentUnavailable: Boolean(
      parentId && !parentQuery.isPending && !parentTask,
    ),
    retryParent: () => void parentQuery.refetch(),
    setScope,
    setHierarchy,
  };
}

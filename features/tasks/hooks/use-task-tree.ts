"use client";

import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import type {
  ListTasksProjectsProjectIdTasksGetParams,
  TaskListResponse,
  TaskRead,
} from "@/lib/api/generated/model";
import {
  getListTasksProjectsProjectIdTasksGetQueryOptions,
  getReadTaskTasksTaskIdGetQueryOptions,
} from "@/lib/api/generated/tasks/tasks";
import {
  branchCanMatch,
  buildTaskTreeRows,
  childTaskQuery,
  mergeTaskTreePages,
  readTaskTreeState,
  taskTreeSeeds,
  writeTaskTreeState,
  type TaskTreeBranch,
  type TaskTreeState,
} from "../lib/task-tree";

export function useTaskTree(
  projectId: number,
  roots: TaskRead[],
  query: ListTasksProjectsProjectIdTasksGetParams,
  filtered: boolean,
  enabled: boolean,
) {
  const params = useSearchParams();
  const client = useQueryClient();
  const state = readTaskTreeState(params, filtered);
  const change = (update: (value: TaskTreeState) => void) => {
    const url = new URL(window.location.href);
    const current = readTaskTreeState(url.searchParams, filtered);
    update(current);
    writeTaskTreeState(url.searchParams, filtered, current);
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  };
  const parentIds = enabled
    ? [
        ...new Set(
          roots
            .filter(
              (task) => state.context.includes(task.id) && task.parent_task_id,
            )
            .map((task) => task.parent_task_id!),
        ),
      ]
    : [];
  const parentQueries = useQueries({
    queries: parentIds.map((id) =>
      getReadTaskTasksTaskIdGetQueryOptions(id, { query: { retry: false } }),
    ),
  });
  const parents = new Map<number, TaskRead>();
  parentQueries.forEach((result, i) => {
    if (
      !result.error &&
      result.data?.project_id === projectId &&
      result.data.id === parentIds[i]
    )
      parents.set(parentIds[i], result.data);
  });
  const { seeds, contextualParents } = taskTreeSeeds(
    roots,
    parents,
    state,
    projectId,
  );
  const expanded = new Set([...state.expanded, ...contextualParents]);
  const options = (params: ListTasksProjectsProjectIdTasksGetParams) =>
    getListTasksProjectsProjectIdTasksGetQueryOptions(projectId, params, {
      query: { retry: false, staleTime: 30_000 },
    });
  const cachedPage = (params: ListTasksProjectsProjectIdTasksGetParams) => {
    const cached = client.getQueryState<TaskListResponse>(
      options(params).queryKey,
    );
    return cached?.status === "success" ? cached.data : undefined;
  };
  const requests: {
    parentId: number;
    page: number;
    matching: boolean;
    params: ListTasksProjectsProjectIdTasksGetParams;
  }[] = [];
  const active = new Set<number>();
  const pending = enabled ? seeds.slice() : [];
  const visited = new Set<number>();
  while (pending.length) {
    const task = pending.shift()!;
    if (task.project_id !== projectId || visited.has(task.id)) continue;
    visited.add(task.id);
    if (!expanded.has(task.id)) continue;
    active.add(task.id);
    const count = state.pages[task.id] ?? 1;
    const pages: (TaskListResponse | undefined)[] = [];
    for (let page = 1; page <= count; page++) {
      if (page > 1 && !pages[page - 2]) break;
      const params = childTaskQuery(task.id, page, query);
      requests.push({ parentId: task.id, page, matching: false, params });
      pages.push(cachedPage(params));
      if (filtered && branchCanMatch(task.id, query))
        requests.push({
          parentId: task.id,
          page,
          matching: true,
          params: childTaskQuery(task.id, page, query, true),
        });
      // 取得済みの最終ページを超える復元URLは追加取得しない。
      if (pages[page - 1] && page * 20 >= pages[page - 1]!.total) break;
    }
    pending.push(...mergeTaskTreePages(pages, projectId, task.id));
  }
  const results = useQueries({
    queries: requests.map((request) => options(request.params)),
  });
  const branches = new Map<number, TaskTreeBranch>();
  for (const parentId of active) {
    const indexes = requests
      .map((request, index) => ({ ...request, index }))
      .filter((request) => request.parentId === parentId);
    const plain = indexes
      .filter((request) => !request.matching)
      .map((request) => results[request.index]);
    const matched = indexes
      .filter((request) => request.matching)
      .map((request) => results[request.index]);
    const pageData = plain.map((result) =>
      result.isError ? undefined : result.data,
    );
    const tasks = mergeTaskTreePages(pageData, projectId, parentId);
    const matchTasks = mergeTaskTreePages(
      matched.map((result) => (result.isError ? undefined : result.data)),
      projectId,
      parentId,
    );
    const matchingComplete = matched.every(
      (result) => result.isSuccess && !result.isFetching,
    );
    const byId = new Map(matchTasks.map((task) => [task.id, task]));
    const consistent = tasks.every(
      (task) =>
        !byId.has(task.id) || byId.get(task.id)!.version === task.version,
    );
    branches.set(parentId, {
      tasks,
      total: pageData[0]?.total ?? tasks.length,
      loading:
        plain.some((result) => result.isPending || result.isFetching) ||
        matched.some((result) => result.isPending || result.isFetching),
      error: [...plain, ...matched].some((result) => result.isError),
      matching:
        filtered && matchingComplete && consistent
          ? new Set(matchTasks.map((task) => task.id))
          : undefined,
    });
  }
  const rows = buildTaskTreeRows({
    seeds,
    roots,
    branches,
    expanded,
    filtered,
    projectId,
  });
  return {
    rows,
    expanded,
    state,
    parentErrors: parentQueries.filter((result) => result.isError),
    parentLoading: parentQueries.some((result) => result.isPending),
    retryParents: () =>
      void Promise.all(parentQueries.map((result) => result.refetch())),
    toggle: (id: number) =>
      change((current) => {
        if (
          current.expanded.includes(id) ||
          current.context.some(
            (value) =>
              (roots.find((task) => task.id === value)?.parent_task_id ??
                value) === id,
          )
        ) {
          current.expanded = current.expanded.filter((value) => value !== id);
          current.context = current.context.filter(
            (value) =>
              (roots.find((task) => task.id === value)?.parent_task_id ??
                value) !== id,
          );
        } else current.expanded = [...new Set([...current.expanded, id])];
      }),
    context: (id: number) =>
      change((current) => {
        current.context = current.context.includes(id)
          ? current.context.filter((value) => value !== id)
          : [...current.context, id];
      }),
    more: (id: number) =>
      change((current) => {
        current.pages[id] = (current.pages[id] ?? 1) + 1;
      }),
    retry: (id: number) =>
      void Promise.all(
        requests.map((request, index) =>
          request.parentId === id ? results[index].refetch() : undefined,
        ),
      ),
  };
}

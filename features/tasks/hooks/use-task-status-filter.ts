"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  readTaskStatusFilter,
  setTaskStatusFilterParams,
  type TaskStatusFilter,
} from "../lib/task-list-filters";

export function useTaskStatusFilter() {
  const params = useSearchParams();
  const filter = readTaskStatusFilter(params);
  const setFilter = useCallback((next: TaskStatusFilter) => {
    const url = new URL(window.location.href);
    setTaskStatusFilterParams(url.searchParams, next);
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);
  return [filter, setFilter] as const;
}

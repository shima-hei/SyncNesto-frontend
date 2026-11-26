"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/providers/auth-provider";
import {
  readHomeProjectsHomeProjectsGet,
  readHomeRequirementWorkHomeRequirementWorkGet,
  readHomeTasksHomeTasksGet,
} from "@/lib/api/generated/home/home";

const queryOptions = {
  staleTime: 30_000,
  refetchInterval: 60_000,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
};

export function useHomeTasks(timezone: string) {
  const { user } = useAuth();
  return useQuery({
    ...queryOptions,
    queryKey: ["home", user?.id, "tasks", timezone],
    queryFn: ({ signal }) =>
      readHomeTasksHomeTasksGet({ timezone, limit: 8 }, { signal }),
    enabled: Boolean(user),
  });
}

export function useHomeProjects(timezone: string) {
  const { user } = useAuth();
  return useQuery({
    ...queryOptions,
    queryKey: ["home", user?.id, "projects", timezone],
    queryFn: ({ signal }) =>
      readHomeProjectsHomeProjectsGet({ timezone, limit: 8 }, { signal }),
    enabled: Boolean(user),
  });
}

export function useHomeRequirementWork(page: number, pageSize: number) {
  const { user } = useAuth();
  return useQuery({
    ...queryOptions,
    queryKey: ["home", "requirement-work", user?.id, page, pageSize],
    queryFn: ({ signal }) =>
      readHomeRequirementWorkHomeRequirementWorkGet(
        { page, page_size: pageSize },
        { signal },
      ),
    placeholderData: keepPreviousData,
    enabled: Boolean(user),
  });
}

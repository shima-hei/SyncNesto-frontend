"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/providers/auth-provider";
import {
  readHomeProjectsHomeProjectsGet,
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

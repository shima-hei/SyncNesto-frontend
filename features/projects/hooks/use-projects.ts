"use client";

import type { ListProjectsProjectsGetParams } from "@/lib/api/generated/model";
import { useListProjectsProjectsGet } from "@/lib/api/generated/projects/projects";

export function useProjects(params: ListProjectsProjectsGetParams) {
  const projectsQuery = useListProjectsProjectsGet(params, {
    query: {
      retry: false,
      placeholderData: (previousData) => previousData,
    },
  });

  return {
    projects: projectsQuery.data?.items ?? [],
    total: projectsQuery.data?.total ?? 0,
    page: projectsQuery.data?.page ?? params.page ?? 1,
    pageSize: projectsQuery.data?.page_size ?? params.page_size ?? 20,
    isLoading: projectsQuery.isLoading,
    isFetching: projectsQuery.isFetching,
    error: projectsQuery.error,
  };
}

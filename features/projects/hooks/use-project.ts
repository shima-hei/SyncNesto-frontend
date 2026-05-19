"use client";

import { useReadProjectProjectsProjectIdGet } from "@/lib/api/generated/projects/projects";

export function useProject(projectId: number) {
  const projectQuery = useReadProjectProjectsProjectIdGet(projectId, {
    query: {
      retry: false,
    },
  });

  return {
    project: projectQuery.data ?? null,
    isLoading: projectQuery.isLoading,
    error: projectQuery.error,
  };
}

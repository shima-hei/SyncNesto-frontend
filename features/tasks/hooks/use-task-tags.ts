import { useListTaskTagsProjectsProjectIdTasksTagsGet } from "@/lib/api/generated/tasks/tasks";

export function useTaskTags(projectId: number) {
  const tagsQuery = useListTaskTagsProjectsProjectIdTasksTagsGet(projectId);

  return {
    tags: tagsQuery.data?.items ?? [],
    isLoading: tagsQuery.isLoading,
    error: tagsQuery.error,
  };
}

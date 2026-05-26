import type { QueryClient } from "@tanstack/react-query";

import type { ProjectRead } from "@/lib/api/generated/model";
import {
  getListProjectMembersProjectsProjectIdMembersGetQueryKey as getProjectMemberListKey,
  getListProjectsProjectsGetQueryKey as getProjectListKey,
  getReadProjectProjectsProjectIdGetQueryKey as getProjectDetailKey,
} from "@/lib/api/generated/projects/projects";

export const invalidateProjectList = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({
    queryKey: getProjectListKey(),
  });
};

export const setProjectDetailCache = (
  queryClient: QueryClient,
  projectId: number,
  project: ProjectRead
) => {
  queryClient.setQueryData(getProjectDetailKey(projectId), project);
};

export const removeProjectDetailCache = (
  queryClient: QueryClient,
  projectId: number
) => {
  queryClient.removeQueries({
    queryKey: getProjectDetailKey(projectId),
  });
};

export const invalidateProjectMemberList = (
  queryClient: QueryClient,
  projectId: number
) => {
  return queryClient.invalidateQueries({
    queryKey: getProjectMemberListKey(projectId),
  });
};

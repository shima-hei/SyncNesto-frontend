import type { QueryClient } from "@tanstack/react-query";

import type { TaskRead } from "@/lib/api/generated/model";
import {
  getListBoardsProjectsProjectIdBoardsGetQueryKey as getBoardListKey,
  getListRequirementTasksRequirementsRequirementIdTasksGetQueryKey as getRequirementTaskListKey,
  getListMilestonesProjectsProjectIdMilestonesGetQueryKey as getMilestoneListKey,
  getListTaskChangeLogsTasksTaskIdChangeLogsGetQueryKey as getTaskChangeLogListKey,
  getListTaskCommentsTasksTaskIdCommentsGetQueryKey as getTaskCommentListKey,
  getListTaskDependenciesTasksTaskIdDependenciesGetQueryKey as getTaskDependencyListKey,
  getListTasksProjectsProjectIdTasksGetQueryKey as getTaskListKey,
  getReadRequirementTaskProgressRequirementsRequirementIdTaskProgressGetQueryKey as getRequirementTaskProgressKey,
  getReadGanttProjectsProjectIdGanttGetQueryKey as getGanttKey,
  getReadTaskTasksTaskIdGetQueryKey as getTaskDetailKey,
  getEffortSummaryProjectsProjectIdTasksEffortSummaryGetQueryKey,
  getListPhasesProjectsProjectIdPhasesGetQueryKey,
} from "@/lib/api/generated/tasks/tasks";

export const invalidateTaskList = (
  queryClient: QueryClient,
  projectId: number,
) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: getTaskListKey(projectId) }),
    queryClient.invalidateQueries({ queryKey: ["home"] }),
  ]);
};

export const invalidateBoardList = (
  queryClient: QueryClient,
  projectId: number,
) => {
  return queryClient.invalidateQueries({
    queryKey: getBoardListKey(projectId),
  });
};

export const invalidateGantt = (
  queryClient: QueryClient,
  projectId: number,
) => {
  return queryClient.invalidateQueries({
    queryKey: getGanttKey(projectId),
  });
};

export const invalidateMilestoneList = (
  queryClient: QueryClient,
  projectId: number,
) => {
  return queryClient.invalidateQueries({
    queryKey: getMilestoneListKey(projectId),
  });
};

export const invalidateRequirementTaskList = (
  queryClient: QueryClient,
  requirementId: number,
) => {
  return queryClient.invalidateQueries({
    queryKey: getRequirementTaskListKey(requirementId),
  });
};

export const invalidateRequirementTaskProgress = (
  queryClient: QueryClient,
  requirementId: number,
) => {
  return queryClient.invalidateQueries({
    queryKey: getRequirementTaskProgressKey(requirementId),
  });
};

export const invalidateTaskDependencies = (
  queryClient: QueryClient,
  taskId: number,
) => {
  return queryClient.invalidateQueries({
    queryKey: getTaskDependencyListKey(taskId),
  });
};

export const invalidateTaskComments = (
  queryClient: QueryClient,
  taskId: number,
) => {
  return queryClient.invalidateQueries({
    queryKey: getTaskCommentListKey(taskId),
  });
};

export const invalidateTaskChangeLogs = (
  queryClient: QueryClient,
  taskId: number,
) => {
  return queryClient.invalidateQueries({
    queryKey: getTaskChangeLogListKey(taskId),
  });
};

export const invalidateTaskDetail = (
  queryClient: QueryClient,
  taskId: number,
) => {
  return queryClient.invalidateQueries({
    queryKey: getTaskDetailKey(taskId),
  });
};

export const invalidateTaskProjectSurfaces = (
  queryClient: QueryClient,
  projectId: number,
  options: { includeBoard?: boolean } = {},
) => {
  const invalidations = [
    queryClient.invalidateQueries({
      queryKey:
        getEffortSummaryProjectsProjectIdTasksEffortSummaryGetQueryKey(
          projectId,
        ),
    }),
    queryClient.invalidateQueries({
      queryKey: getListPhasesProjectsProjectIdPhasesGetQueryKey(projectId),
    }),
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        const data = query.state.data as TaskRead | TaskRead[] | undefined;
        return (
          typeof key === "string" &&
          (/^\/tasks\/\d+$/.test(key) ||
            /^\/requirements\/\d+\/tasks$/.test(key)) &&
          (Array.isArray(data)
            ? data.some((task) => task.project_id === projectId)
            : data?.project_id === projectId)
        );
      },
    }),
    invalidateTaskList(queryClient, projectId),
    invalidateGantt(queryClient, projectId),
  ];

  if (options.includeBoard) {
    invalidations.push(invalidateBoardList(queryClient, projectId));
  }

  return Promise.all(invalidations);
};

export const setTaskDetailCache = (
  queryClient: QueryClient,
  taskId: number,
  task: TaskRead,
) => {
  queryClient.setQueryData(getTaskDetailKey(taskId), task);
};

export const removeTaskDetailCache = (
  queryClient: QueryClient,
  taskId: number,
) => {
  queryClient.removeQueries({
    queryKey: getTaskDetailKey(taskId),
  });
};

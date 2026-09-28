"use client";

import { useTasks } from "./use-tasks";

const SUMMARY_PAGE_SIZE = 5;

const toDateValue = (date: Date) => {
  return date.toISOString().slice(0, 10);
};

const getUpcomingDueDate = () => {
  const date = new Date();

  date.setDate(date.getDate() + 7);

  return toDateValue(date);
};

export function useTaskSummary(projectId: number) {
  const allTasksQuery = useTasks(projectId, {
    page: 1,
    page_size: 1,
  });
  const doneQuery = useTasks(projectId, {
    page: 1,
    page_size: 1,
    status: "done",
  });
  const blockedQuery = useTasks(projectId, {
    page: 1,
    page_size: 1,
    status: "blocked",
  });
  const cancelledQuery = useTasks(projectId, {
    page: 1,
    page_size: 1,
    status: "cancelled",
  });
  const overdueQuery = useTasks(projectId, {
    page: 1,
    page_size: SUMMARY_PAGE_SIZE,
    overdue: true,
  });
  const upcomingDueQuery = useTasks(projectId, {
    page: 1,
    page_size: SUMMARY_PAGE_SIZE,
    due_date_to: getUpcomingDueDate(),
  });
  const queries = [
    allTasksQuery,
    doneQuery,
    cancelledQuery,
    blockedQuery,
    overdueQuery,
    upcomingDueQuery,
  ];

  return {
    total: allTasksQuery.total,
    incompleteTotal: Math.max(
      0,
      allTasksQuery.total - doneQuery.total - cancelledQuery.total,
    ),
    blockedTotal: blockedQuery.total,
    overdueTotal: overdueQuery.total,
    overdueTasks: overdueQuery.tasks,
    upcomingDueTasks: upcomingDueQuery.tasks,
    isLoading: queries.some((query) => query.isLoading),
    hasError: queries.some((query) => query.error !== null),
  };
}

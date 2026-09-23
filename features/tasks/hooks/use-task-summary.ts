"use client";

import { useMemo } from "react";

import { TASK_STATUS_OPTIONS } from "../constants/task-options";
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
    page_size: SUMMARY_PAGE_SIZE,
  });
  const backlogQuery = useTasks(projectId, {
    page: 1,
    page_size: 1,
    status: "backlog",
  });
  const todoQuery = useTasks(projectId, {
    page: 1,
    page_size: 1,
    status: "todo",
  });
  const inProgressQuery = useTasks(projectId, {
    page: 1,
    page_size: 1,
    status: "in_progress",
  });
  const inReviewQuery = useTasks(projectId, {
    page: 1,
    page_size: 1,
    status: "in_review",
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
  const statusQueries = useMemo(
    () => [
      backlogQuery,
      todoQuery,
      inProgressQuery,
      inReviewQuery,
      doneQuery,
      blockedQuery,
      cancelledQuery,
    ],
    [
      backlogQuery,
      blockedQuery,
      cancelledQuery,
      doneQuery,
      inProgressQuery,
      inReviewQuery,
      todoQuery,
    ],
  );
  const statusCounts = TASK_STATUS_OPTIONS.map((option, index) => ({
    ...option,
    total: statusQueries[index]?.total ?? 0,
  }));
  const isLoading =
    allTasksQuery.isLoading ||
    overdueQuery.isLoading ||
    upcomingDueQuery.isLoading ||
    statusQueries.some((query) => query.isLoading);

  return {
    total: allTasksQuery.total,
    incompleteTotal: statusCounts
      .filter(
        (status) => status.value !== "done" && status.value !== "cancelled",
      )
      .reduce((sum, status) => sum + status.total, 0),
    blockedTotal: blockedQuery.total,
    overdueTotal: overdueQuery.total,
    overdueTasks: overdueQuery.tasks,
    upcomingDueTasks: upcomingDueQuery.tasks,
    statusCounts,
    isLoading,
  };
}

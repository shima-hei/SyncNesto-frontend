"use client";

import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskRead } from "@/lib/api/generated/model";
import { formatDate } from "@/lib/format/date";

import { useTasks } from "../../hooks/use-tasks";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
  TaskTypeBadge,
} from "../shared/task-badges";
import { TaskDetailLink } from "../tables/tasks-table";

const HIERARCHY_LIST_SIZE = 10;

type TaskHierarchySectionProps = {
  projectId: number;
  task: TaskRead;
  parentTask: TaskRead | null;
};

export function TaskHierarchySection({
  projectId,
  task,
  parentTask,
}: TaskHierarchySectionProps) {
  const { tasks: childTasks, isLoading: isChildLoading } = useTasks(projectId, {
    page: 1,
    page_size: HIERARCHY_LIST_SIZE,
    parent_task_id: task.id,
    sort: "updated_desc",
  });
  const { tasks: siblingTasks, isLoading: isSiblingLoading } = useTasks(
    projectId,
    {
      page: 1,
      page_size: HIERARCHY_LIST_SIZE,
      parent_task_id: task.parent_task_id ?? undefined,
      root_only: task.parent_task_id ? undefined : true,
      sort: "updated_desc",
    }
  );
  const visibleSiblingTasks = task.parent_task_id
    ? siblingTasks.filter((siblingTask) => siblingTask.id !== task.id)
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>タスク階層</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-3">
        <HierarchyPanel title="親タスク">
          {task.parent_task_id ? (
            <TaskHierarchyItem
              projectId={projectId}
              task={parentTask}
              fallbackTaskId={task.parent_task_id}
            />
          ) : (
            <EmptyHierarchyText>親タスクはありません。</EmptyHierarchyText>
          )}
        </HierarchyPanel>

        <HierarchyPanel title="子タスク">
          {isChildLoading ? (
            <EmptyHierarchyText>子タスクを読み込んでいます。</EmptyHierarchyText>
          ) : childTasks.length ? (
            <TaskHierarchyList projectId={projectId} tasks={childTasks} />
          ) : (
            <EmptyHierarchyText>子タスクはありません。</EmptyHierarchyText>
          )}
        </HierarchyPanel>

        <HierarchyPanel title="同じ親のタスク">
          {!task.parent_task_id ? (
            <EmptyHierarchyText>
              親タスクがある場合に表示されます。
            </EmptyHierarchyText>
          ) : isSiblingLoading ? (
            <EmptyHierarchyText>関連タスクを読み込んでいます。</EmptyHierarchyText>
          ) : visibleSiblingTasks.length ? (
            <TaskHierarchyList
              projectId={projectId}
              tasks={visibleSiblingTasks}
            />
          ) : (
            <EmptyHierarchyText>同じ親のタスクはありません。</EmptyHierarchyText>
          )}
        </HierarchyPanel>
      </CardContent>
    </Card>
  );
}

function HierarchyPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-lg border p-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  );
}

function TaskHierarchyList({
  projectId,
  tasks,
}: {
  projectId: number;
  tasks: TaskRead[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskHierarchyItem key={task.id} projectId={projectId} task={task} />
      ))}
    </div>
  );
}

function TaskHierarchyItem({
  projectId,
  task,
  fallbackTaskId,
}: {
  projectId?: number;
  task: TaskRead | null;
  fallbackTaskId?: number;
}) {
  if (!task) {
    return (
      <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
        タスクID: {fallbackTaskId}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-md bg-muted px-3 py-2">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs text-muted-foreground">{task.task_code}</span>
        <span className="truncate text-sm font-medium">{task.title}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <TaskTypeBadge type={task.task_type} />
        <TaskStatusBadge status={task.status} />
        <TaskPriorityBadge priority={task.priority} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          期限: {formatDate(task.due_date)}
        </span>
        {projectId ? <TaskDetailLink projectId={projectId} task={task} /> : null}
      </div>
    </div>
  );
}

function EmptyHierarchyText({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

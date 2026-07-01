"use client";

import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskRead } from "@/lib/api/generated/model";
import { formatDate } from "@/lib/format/date";

import { useTasks } from "../../hooks/use-tasks";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
  TaskTags,
  TaskTypeBadge,
} from "../shared/task-badges";
import { TaskIdentity } from "../shared/task-identity";
import { TaskDetailLink } from "../tables/tasks-table";

const HIERARCHY_LIST_SIZE = 50;

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
    sort: "code_asc",
  });
  const { tasks: siblingTasks, isLoading: isSiblingLoading } = useTasks(
    projectId,
    {
      page: 1,
      page_size: HIERARCHY_LIST_SIZE,
      parent_task_id: task.parent_task_id ?? undefined,
      root_only: task.parent_task_id ? undefined : true,
      sort: "code_asc",
    },
  );
  const sortedChildTasks = sortTasksByCreatedAt(childTasks);
  const sortedSiblingTasks = sortTasksByCreatedAt(siblingTasks);
  const visibleSiblingTasks = task.parent_task_id
    ? sortedSiblingTasks.filter((siblingTask) => siblingTask.id !== task.id)
    : [];
  const currentTreeSiblings = task.parent_task_id
    ? ensureCurrentTaskInSiblings({
        currentTask: task,
        siblings: sortedSiblingTasks,
        fallbackSiblings: visibleSiblingTasks,
      })
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>タスク階層</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[32rem] overflow-y-auto pr-2">
          {task.parent_task_id ? (
            <div className="flex flex-col gap-1.5">
              <TaskTreeNode
                projectId={projectId}
                task={parentTask}
                fallbackTaskId={task.parent_task_id}
                depth={0}
              />
              <TaskTreeBranch>
                {isSiblingLoading ? (
                  <EmptyHierarchyText>
                    階層を読み込んでいます。
                  </EmptyHierarchyText>
                ) : (
                  currentTreeSiblings.map((treeTask) => (
                    <TaskTreeNodeGroup
                      key={treeTask.id}
                      projectId={projectId}
                      task={treeTask}
                      currentTaskId={task.id}
                      childTasks={sortedChildTasks}
                      isChildLoading={isChildLoading}
                    />
                  ))
                )}
              </TaskTreeBranch>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <TaskTreeNode
                projectId={projectId}
                task={task}
                depth={0}
                isCurrent
              />
              <TaskTreeBranch>
                {isChildLoading ? (
                  <EmptyHierarchyText>
                    子タスクを読み込んでいます。
                  </EmptyHierarchyText>
                ) : sortedChildTasks.length ? (
                  sortedChildTasks.map((childTask) => (
                    <TaskTreeNode
                      key={childTask.id}
                      projectId={projectId}
                      task={childTask}
                      depth={1}
                    />
                  ))
                ) : (
                  <EmptyHierarchyText>
                    子タスクはありません。
                  </EmptyHierarchyText>
                )}
              </TaskTreeBranch>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TaskTreeNodeGroup({
  projectId,
  task,
  currentTaskId,
  childTasks,
  isChildLoading,
}: {
  projectId: number;
  task: TaskRead;
  currentTaskId: number;
  childTasks: TaskRead[];
  isChildLoading: boolean;
}) {
  const isCurrent = task.id === currentTaskId;

  return (
    <div className="flex flex-col gap-1.5">
      <TaskTreeNode
        projectId={projectId}
        task={task}
        depth={1}
        isCurrent={isCurrent}
      />
      {isCurrent ? (
        <TaskTreeBranch>
          {isChildLoading ? (
            <EmptyHierarchyText>
              子タスクを読み込んでいます。
            </EmptyHierarchyText>
          ) : childTasks.length ? (
            childTasks.map((childTask) => (
              <TaskTreeNode
                key={childTask.id}
                projectId={projectId}
                task={childTask}
                depth={2}
              />
            ))
          ) : (
            <EmptyHierarchyText>子タスクはありません。</EmptyHierarchyText>
          )}
        </TaskTreeBranch>
      ) : null}
    </div>
  );
}

function TaskTreeNode({
  projectId,
  task,
  fallbackTaskId,
  depth,
  isCurrent = false,
}: {
  projectId?: number;
  task: TaskRead | null;
  fallbackTaskId?: number;
  depth: number;
  isCurrent?: boolean;
}) {
  if (!task) {
    return (
      <div
        className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground"
        style={{ marginLeft: `${depth * 1.5}rem` }}
      >
        タスクID: {fallbackTaskId}
      </div>
    );
  }

  return (
    <div
      className={`relative flex min-w-0 flex-col gap-1.5 rounded-md border px-2.5 py-2 ${
        isCurrent ? "border-foreground bg-background" : "bg-muted"
      }`}
      style={{ marginLeft: `${depth * 1.25}rem` }}
    >
      {depth > 0 ? (
        <span className="absolute -left-3 top-5 h-px w-3 bg-border" />
      ) : null}
      <div className="flex min-w-0 items-center justify-between gap-3">
        <TaskIdentity
          task={task}
          className="min-w-0 truncate text-sm font-medium"
        />
        <div className="flex shrink-0 items-center gap-2">
          {isCurrent ? (
            <span className="rounded-md bg-foreground px-2 py-1 text-xs text-background">
              表示中
            </span>
          ) : null}
          {projectId ? (
            <TaskDetailLink projectId={projectId} task={task} />
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <TaskTypeBadge type={task.task_type} />
        <TaskStatusBadge status={task.status} />
        <TaskPriorityBadge priority={task.priority} />
        <TaskTags tags={task.tags} />
        <span>期限: {formatDate(task.due_date)}</span>
      </div>
    </div>
  );
}

function TaskTreeBranch({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex flex-col gap-1.5 border-l pl-3">
      {children}
    </div>
  );
}

function EmptyHierarchyText({ children }: { children: ReactNode }) {
  return <p className="py-2 text-sm text-muted-foreground">{children}</p>;
}

const ensureCurrentTaskInSiblings = ({
  currentTask,
  siblings,
  fallbackSiblings,
}: {
  currentTask: TaskRead;
  siblings: TaskRead[];
  fallbackSiblings: TaskRead[];
}) => {
  if (siblings.some((siblingTask) => siblingTask.id === currentTask.id)) {
    return siblings;
  }

  return [...fallbackSiblings, currentTask].sort((left, right) => {
    return compareTaskCreatedAt(left, right);
  });
};

const sortTasksByCreatedAt = (tasks: TaskRead[]) => {
  return [...tasks].sort(compareTaskCreatedAt);
};

const compareTaskCreatedAt = (left: TaskRead, right: TaskRead) => {
  return (
    new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  );
};

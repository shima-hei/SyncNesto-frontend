"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useListNavigation } from "@/hooks/use-list-navigation";
import type { TaskRead } from "@/lib/api/generated/model";
import {
  getListTasksProjectsProjectIdTasksGetQueryKey,
  listTasksProjectsProjectIdTasksGet,
} from "@/lib/api/generated/tasks/tasks";
import { cn } from "@/lib/utils";

import { useCreateTask } from "../../hooks/use-create-task";
import { useTask } from "../../hooks/use-task";
import { getChildTaskInitialValues } from "../../lib/task-mappers";
import {
  childTaskQuery,
  mergeTaskTreePages,
  TASK_TREE_PAGE_SIZE,
} from "../../lib/task-tree";
import { TaskQuickCreate } from "../forms/task-quick-create";
import { TaskStatusBadge } from "../shared/task-badges";

const MAX_ANCESTORS = 16;

type TreeContext = {
  currentId: number;
  createForId: number | null;
  setCreateForId: (id: number | null) => void;
  canCreate: boolean;
  detailHref: (id: number) => string;
  create: ReturnType<typeof useCreateTask>;
};

export function TaskHierarchySection({
  projectId,
  task,
  canCreate,
}: {
  projectId: number;
  task: TaskRead;
  canCreate: boolean;
}) {
  const labelId = useId();
  const [createForId, setCreateForId] = useState<number | null>(null);
  const listHref = `/projects/joined/${projectId}/tasks`;
  const { withReturn } = useListNavigation(listHref);
  const context: TreeContext = {
    currentId: task.id,
    createForId,
    setCreateForId,
    canCreate,
    detailHref: (id) => withReturn(`${listHref}/${id}`),
    create: useCreateTask(projectId),
  };
  return (
    <section aria-labelledby={labelId} className="space-y-2 border-t pt-3">
      <h2 id={labelId} className="text-sm font-semibold">
        タスク階層
      </h2>
      <TaskHierarchyRoot path={[task]} context={context} />
    </section>
  );
}

function TaskHierarchyRoot({
  path,
  context,
}: {
  path: TaskRead[];
  context: TreeContext;
}) {
  const root = path[0];
  const parentId = root.parent_task_id;
  const limit = path.length > MAX_ANCESTORS;
  const cycle = path.some((item) => item.id === parentId);
  const {
    task: parent,
    isLoading,
    error,
  } = useTask(!limit && !cycle ? parentId : null);
  if (isLoading)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        上位の階層を読み込んでいます…
      </p>
    );
  if (
    parent &&
    !error &&
    parent.project_id === root.project_id &&
    parent.id === parentId
  )
    return <TaskHierarchyRoot path={[parent, ...path]} context={context} />;
  return (
    <>
      {parentId && (
        <p className="text-xs text-muted-foreground">
          {limit
            ? "直近の上位階層を表示しています。"
            : "これより上の階層を表示できません。"}
        </p>
      )}
      <ul role="list">
        <TaskHierarchyNode
          task={root}
          path={path.slice(1)}
          ancestors={[]}
          context={context}
        />
      </ul>
    </>
  );
}

function TaskHierarchyNode({
  task,
  path,
  ancestors,
  context,
}: {
  task: TaskRead;
  path: TaskRead[];
  ancestors: number[];
  context: TreeContext;
}) {
  const current = task.id === context.currentId;
  const [expanded, setExpanded] = useState(current || path.length > 0);
  const childrenId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const hasBranch = Boolean(task.has_children || path.length);
  const projectId = task.project_id;
  const branch = useInfiniteQuery({
    queryKey: [
      ...getListTasksProjectsProjectIdTasksGetQueryKey(projectId),
      "detail-children",
      task.id,
    ],
    queryFn: ({ pageParam, signal }) =>
      listTasksProjectsProjectIdTasksGet(
        projectId,
        childTaskQuery(task.id, pageParam, { sort: "code_asc" }),
        { signal },
      ),
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      pages.length * TASK_TREE_PAGE_SIZE < last.total
        ? pages.length + 1
        : undefined,
    enabled: hasBranch && expanded,
    staleTime: 30_000,
    retry: false,
  });
  const lineage = [...ancestors, task.id];
  const children = mergeTaskTreePages(
    branch.data?.pages ?? [],
    projectId,
    task.id,
  ).filter((child) => !lineage.includes(child.id));
  const onPath = path[0];
  if (onPath && !children.some((child) => child.id === onPath.id))
    children.unshift(onPath);
  const childCreateOpen = context.createForId === task.id;
  const closeCreate = () => {
    context.setCreateForId(null);
    requestAnimationFrame(() => addRef.current?.focus({ preventScroll: true }));
  };
  const more = async () => {
    const result = await branch.fetchNextPage();
    if (!result.hasNextPage && !result.isError) toggleRef.current?.focus();
  };
  return (
    <li data-hierarchy-node={task.id} className="min-w-0">
      <div
        className={cn(
          "group/node flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 rounded-md px-1 py-1",
          current && "bg-muted/55",
        )}
      >
        {hasBranch ? (
          <Button
            ref={toggleRef}
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0"
            aria-expanded={expanded}
            aria-controls={childrenId}
            aria-label={`${task.title}の子タスクを${expanded ? "折りたたむ" : "展開する"}`}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </Button>
        ) : (
          <span aria-hidden="true" className="w-7 shrink-0" />
        )}
        <div className="min-w-24 flex-1">
          {current ? (
            <span
              aria-current="page"
              className="text-sm font-semibold break-words"
            >
              {task.title}
            </span>
          ) : (
            <Link
              href={context.detailHref(task.id)}
              className="rounded text-sm font-medium break-words underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {task.title}
            </Link>
          )}
          <p className="flex flex-wrap gap-x-1 text-xs text-muted-foreground">
            <span>{task.task_code}</span>
            {current && (
              <span className="whitespace-nowrap">· 現在のタスク</span>
            )}
            {ancestors.length > 6 && (
              <span className="whitespace-nowrap">
                · 階層 {ancestors.length + 1}
              </span>
            )}
          </p>
        </div>
        <TaskStatusBadge status={task.status} />
        {context.canCreate && (
          <Button
            ref={addRef}
            type="button"
            variant="ghost"
            size={current ? "sm" : "icon-sm"}
            className={cn(
              "shrink-0",
              !current &&
                "[@media(hover:hover)]:opacity-0 group-hover/node:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100",
            )}
            disabled={context.create.isPending}
            aria-expanded={childCreateOpen}
            aria-label={current ? undefined : `${task.title}に子タスクを追加`}
            onClick={() =>
              childCreateOpen ? closeCreate() : context.setCreateForId(task.id)
            }
          >
            <PlusIcon aria-hidden />
            {current && "子タスクを追加"}
          </Button>
        )}
      </div>
      {childCreateOpen && context.canCreate && (
        <div className="mt-1">
          <TaskQuickCreate
            projectId={projectId}
            label="新しい子タスク"
            focusOnOpen
            initialValues={getChildTaskInitialValues(task)}
            submitTask={(values) =>
              context.create.createTask(values, { navigateAfterCreate: false })
            }
            isPending={context.create.isPending}
            error={context.create.error}
            onClose={closeCreate}
            onCreated={() => setExpanded(true)}
          />
        </div>
      )}
      {hasBranch && (
        <div
          id={childrenId}
          hidden={!expanded}
          className={cn(
            "min-w-0",
            ancestors.length < 6 && "ml-4 border-s pl-2",
          )}
        >
          {expanded && (
            <>
              {children.length > 0 && (
                <ul role="list">
                  {children.map((child) => (
                    <TaskHierarchyNode
                      key={child.id}
                      task={onPath?.id === child.id ? onPath : child}
                      path={onPath?.id === child.id ? path.slice(1) : []}
                      ancestors={lineage}
                      context={context}
                    />
                  ))}
                </ul>
              )}
              {branch.isError ? (
                <div
                  role="alert"
                  className="flex flex-wrap items-center gap-2 pl-2 text-xs text-muted-foreground"
                >
                  子タスクを取得できませんでした。
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      void (branch.isFetchNextPageError
                        ? more()
                        : branch.refetch())
                    }
                  >
                    再試行
                  </Button>
                </div>
              ) : branch.isPending ? (
                <p
                  role="status"
                  className="py-1 pl-2 text-xs text-muted-foreground"
                >
                  子タスクを読み込んでいます…
                </p>
              ) : branch.hasNextPage ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-disabled={branch.isFetchingNextPage}
                  onClick={() => {
                    if (!branch.isFetchingNextPage) void more();
                  }}
                >
                  {branch.isFetchingNextPage
                    ? "読み込み中…"
                    : "次の子タスクを表示"}
                </Button>
              ) : null}
            </>
          )}
        </div>
      )}
    </li>
  );
}

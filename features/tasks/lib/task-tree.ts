import type {
  ListTasksProjectsProjectIdTasksGetParams,
  TaskListResponse,
  TaskRead,
} from "@/lib/api/generated/model";

export const TASK_TREE_PAGE_SIZE = 20;
export type TaskTreeState = {
  expanded: number[];
  pages: Record<number, number>;
  context: number[];
};
export type TaskTreeBranch = {
  tasks: TaskRead[];
  total: number;
  loading: boolean;
  error: boolean;
  matching?: Set<number>;
};
export type TaskTreeRow =
  | {
      kind: "task";
      task: TaskRead;
      depth: number;
      source: "match" | "other-match" | "outside" | "context";
    }
  | {
      kind: "loading" | "error" | "more";
      parentId: number;
      depth: number;
      shown: number;
      total: number;
    };

const id = (value: string) =>
  /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 2147483647;
export function readTaskTreeState(
  params: Pick<URLSearchParams, "get">,
  filtered: boolean,
): TaskTreeState {
  const prefix = filtered ? "taskSearch" : "taskTree";
  const expanded = [
    ...new Set(
      (params.get(`${prefix}Expanded`) ?? "").split(",").filter(id).map(Number),
    ),
  ];
  const pages = Object.fromEntries(
    (params.get(`${prefix}Pages`) ?? "")
      .split(",")
      .map((value) => value.split(":"))
      .filter(([key, value]) => id(key ?? "") && id(value ?? ""))
      .map(([key, value]) => [key, Number(value)]),
  );
  const context = filtered
    ? [
        ...new Set(
          (params.get("taskContext") ?? "").split(",").filter(id).map(Number),
        ),
      ].slice(0, 20)
    : [];
  return { expanded, pages, context };
}
export function writeTaskTreeState(
  params: URLSearchParams,
  filtered: boolean,
  state: TaskTreeState,
) {
  const prefix = filtered ? "taskSearch" : "taskTree";
  const put = (key: string, value: string) =>
    value ? params.set(key, value) : params.delete(key);
  put(`${prefix}Expanded`, state.expanded.join(","));
  put(
    `${prefix}Pages`,
    Object.entries(state.pages)
      .map(([key, value]) => `${key}:${value}`)
      .join(","),
  );
  if (filtered) put("taskContext", state.context.join(","));
}
export function taskQueryHasFilters(
  query: ListTasksProjectsProjectIdTasksGetParams,
) {
  return Object.entries(query).some(
    ([key, value]) =>
      !["page", "page_size", "sort", "root_only", "parent_task_id"].includes(
        key,
      ) &&
      value !== undefined &&
      value !== null &&
      value !== "" &&
      (!Array.isArray(value) || value.length > 0),
  );
}
export function childTaskQuery(
  parentId: number,
  page: number,
  query: ListTasksProjectsProjectIdTasksGetParams,
  matching = false,
): ListTasksProjectsProjectIdTasksGetParams {
  return {
    ...(matching ? query : {}),
    parent_task_id: parentId,
    root_only: undefined,
    page,
    page_size: TASK_TREE_PAGE_SIZE,
    sort: query.sort,
  };
}
export function branchCanMatch(
  parentId: number,
  query: ListTasksProjectsProjectIdTasksGetParams,
) {
  return (
    !query.root_only &&
    (query.parent_task_id == null || query.parent_task_id === parentId)
  );
}
export function taskTreeSeeds(
  roots: TaskRead[],
  parents: Map<number, TaskRead>,
  state: TaskTreeState,
  projectId: number,
) {
  const contextualParents = new Set(
    roots
      .filter((task) => state.context.includes(task.id))
      .map((task) => task.parent_task_id ?? task.id),
  );
  const seeds: TaskRead[] = [];
  const added = new Set<number>();
  for (const task of roots) {
    if (task.project_id !== projectId) continue;
    const parent = task.parent_task_id
      ? parents.get(task.parent_task_id)
      : null;
    const candidate =
      parent?.project_id === projectId && contextualParents.has(parent.id)
        ? parent
        : task;
    if (!added.has(candidate.id)) {
      added.add(candidate.id);
      seeds.push(candidate);
    }
    // 周辺の子ページに未取得の一致行も、検索ページの明細として必ず残す。
    if (!added.has(task.id)) {
      added.add(task.id);
      seeds.push(task);
    }
  }
  return { seeds, contextualParents };
}
export function mergeTaskTreePages(
  pages: (TaskListResponse | undefined)[],
  projectId: number,
  parentId: number,
) {
  const tasks = new Map<number, TaskRead>();
  for (const page of pages) {
    if (!page) break;
    for (const task of page.items)
      if (task.project_id === projectId && task.parent_task_id === parentId)
        tasks.set(task.id, task);
  }
  return [...tasks.values()];
}
export function buildTaskTreeRows({
  seeds,
  roots,
  branches,
  expanded,
  filtered,
  projectId,
}: {
  seeds: TaskRead[];
  roots: TaskRead[];
  branches: Map<number, TaskTreeBranch>;
  expanded: Set<number>;
  filtered: boolean;
  projectId: number;
}) {
  const rows: TaskTreeRow[] = [];
  const emitted = new Set<number>();
  const matches = new Set(roots.map((task) => task.id));
  type TaskEntry = Extract<TaskTreeRow, { kind: "task" }>;
  const stack: (TaskEntry | { kind: "feedback"; row: TaskTreeRow })[] = seeds
    .slice()
    .reverse()
    .map((task) => ({
      kind: "task",
      task,
      depth:
        filtered &&
        task.parent_task_id &&
        seeds.some((parent) => parent.id === task.parent_task_id)
          ? 1
          : 0,
      source: matches.has(task.id) || !filtered ? "match" : "context",
    }));
  while (stack.length) {
    const entry = stack.pop()!;
    if (entry.kind === "feedback") {
      rows.push(entry.row);
      continue;
    }
    if (entry.task.project_id !== projectId || emitted.has(entry.task.id))
      continue;
    emitted.add(entry.task.id);
    rows.push(entry);
    if (!expanded.has(entry.task.id)) continue;
    const branch = branches.get(entry.task.id);
    if (!branch) continue;
    const children = branch.tasks.filter(
      (task) => task.parent_task_id === entry.task.id,
    );
    // 後続行は子の後に置く。循環や重複はTask IDで打ち切る。
    const feedback = branch.error
      ? "error"
      : branch.loading
        ? "loading"
        : children.length < branch.total
          ? "more"
          : null;
    if (feedback)
      stack.push({
        kind: "feedback",
        row: {
          kind: feedback,
          parentId: entry.task.id,
          depth: entry.depth + 1,
          shown: children.length,
          total: branch.total,
        },
      });
    for (const task of children.slice().reverse())
      stack.push({
        kind: "task",
        task,
        depth: entry.depth + 1,
        source:
          !filtered || matches.has(task.id)
            ? "match"
            : branch.matching?.has(task.id)
              ? "other-match"
              : branch.matching
                ? "outside"
                : "context",
      });
  }
  return rows;
}

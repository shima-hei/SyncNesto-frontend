import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = ts.transpileModule(
  fs.readFileSync(
    new URL("../features/tasks/lib/task-tree.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  },
).outputText;
const tree = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const task = (id, parent_task_id = null, project_id = 5) => ({
  id,
  parent_task_id,
  project_id,
  title: `Task ${id}`,
  version: 1,
});
const branch = (tasks, extra = {}) => ({
  tasks,
  total: tasks.length,
  loading: false,
  error: false,
  ...extra,
});
const build = (roots, branches, expanded, extra = {}) =>
  tree.buildTaskTreeRows({
    roots,
    seeds: roots,
    branches: new Map(branches),
    expanded: new Set(expanded),
    filtered: false,
    projectId: 5,
    ...extra,
  });

test("root paging is independent of 127 children and does not aggregate or duplicate Task values", () => {
  const roots = [task(1), task(2)];
  roots[0].progress_percent = 14;
  const rows = build(
    roots,
    [
      [
        1,
        branch(
          Array.from({ length: 20 }, (_, i) => task(100 + i, 1)),
          { total: 127 },
        ),
      ],
    ],
    [1],
  );
  assert.equal(rows.filter((row) => row.kind === "task").length, 22);
  assert.equal(rows[21].kind, "more");
  assert.equal(rows[21].total, 127);
  assert.equal(rows.at(-1).task.id, 2);
  assert.equal(roots[0].progress_percent, 14);
});
test("a shared contextual parent and matching sibling render once, without changing matching page membership", () => {
  const roots = [task(2, 1), task(3, 1)];
  const state = { context: [2], expanded: [], pages: {} };
  const { seeds, contextualParents } = tree.taskTreeSeeds(
    roots,
    new Map([[1, task(1)]]),
    state,
    5,
  );
  const rows = build(
    roots,
    [
      [
        1,
        branch([task(2, 1), task(3, 1), task(4, 1)], {
          matching: new Set([2, 3, 4]),
        }),
      ],
    ],
    contextualParents,
    { seeds, filtered: true },
  );
  assert.deepEqual(
    rows.map((row) => row.task.id),
    [1, 2, 3, 4],
  );
  assert.deepEqual(
    rows.map((row) => row.source),
    ["context", "match", "match", "other-match"],
  );
  assert.equal(roots.length, 2);
});
test("server-checked nonmatches and unverified parent context stay distinct", () => {
  const rows = build(
    [task(1)],
    [[1, branch([task(2, 1), task(3, 1)], { matching: new Set([3]) })]],
    [1],
    { filtered: true },
  );
  assert.deepEqual(
    rows.map((row) => row.source),
    ["match", "outside", "other-match"],
  );
  assert.equal(
    build([task(1)], [[1, branch([task(2, 1)])]], [1], { filtered: true })[1]
      .source,
    "context",
  );
});
test("matching rows outside the loaded sibling prefix remain visible when parent context is opened", () => {
  const roots = Array.from({ length: 20 }, (_, i) => task(101 + i * 2, 1));
  const { seeds, contextualParents } = tree.taskTreeSeeds(
    roots,
    new Map([[1, task(1)]]),
    { context: [101], expanded: [], pages: {} },
    5,
  );
  const children = Array.from({ length: 20 }, (_, i) => task(101 + i, 1));
  const rows = build(
    roots,
    [
      [
        1,
        branch(children, {
          total: 127,
          matching: new Set(roots.map((task) => task.id)),
        }),
      ],
    ],
    contextualParents,
    { seeds, filtered: true },
  );
  const matches = rows.filter(
    (row) => row.kind === "task" && row.source === "match",
  );
  assert.equal(matches.length, 20);
  assert.deepEqual(
    new Set(matches.map((row) => row.task.id)),
    new Set(roots.map((task) => task.id)),
  );
  assert.equal(
    new Set(rows.filter((row) => row.kind === "task").map((row) => row.task.id))
      .size,
    rows.filter((row) => row.kind === "task").length,
  );
});
test("unavailable or foreign parents are never invented or exposed", () => {
  const roots = [task(2, 1)];
  const state = { context: [2], expanded: [], pages: {} };
  assert.deepEqual(
    tree.taskTreeSeeds(roots, new Map([[1, task(1, null, 7)]]), state, 5).seeds,
    roots,
  );
  assert.deepEqual(
    build(roots, [[2, branch([task(3, 2, 7)])]], [2])
      .filter((row) => row.kind === "task")
      .map((row) => row.task.id),
    [2],
  );
});
test("deep hierarchy, cycles and conflicting page duplicates terminate with unique IDs", () => {
  const tasks = Array.from({ length: 120 }, (_, i) => task(i + 1, i || null));
  tasks[0].parent_task_id = 120;
  const rows = build(
    [tasks[0]],
    tasks.map((value, i) => [
      value.id,
      branch(i === 119 ? [tasks[0]] : [tasks[i + 1]]),
    ]),
    tasks.map((task) => task.id),
  );
  assert.equal(rows.length, 120);
  assert.equal(rows.at(-1).depth, 119);
  const pages = [
    { items: [task(2, 1)], total: 2 },
    {
      items: [{ ...task(2, 1), version: 2 }, task(3, 1), task(4, 8)],
      total: 2,
    },
  ];
  assert.deepEqual(
    tree.mergeTaskTreePages(pages, 5, 1).map((task) => [task.id, task.version]),
    [
      [2, 2],
      [3, 1],
    ],
  );
  assert.deepEqual(tree.mergeTaskTreePages([undefined, pages[1]], 5, 1), []);
});
test("loading and failure appear after retained child rows, preserving sibling branches", () => {
  const rows = build(
    [task(1), task(5)],
    [[1, branch([task(2, 1)], { loading: true, error: true, total: 4 })]],
    [1],
  );
  assert.deepEqual(
    rows.map((row) => row.kind),
    ["task", "task", "error", "task"],
  );
});
test("normal and search URL states remain separate and restore pages without changing existing filters", () => {
  const params = new URLSearchParams(
    "q=API&statuses=todo&tab=list&taskTreeExpanded=1&taskTreePages=1:3",
  );
  tree.writeTaskTreeState(params, true, {
    expanded: [2, 3],
    pages: { 2: 2 },
    context: [4],
  });
  assert.deepEqual(tree.readTaskTreeState(params, false), {
    expanded: [1],
    pages: { 1: 3 },
    context: [],
  });
  assert.deepEqual(tree.readTaskTreeState(params, true), {
    expanded: [2, 3],
    pages: { 2: 2 },
    context: [4],
  });
  params.delete("q");
  assert.equal(params.get("statuses"), "todo");
  assert.deepEqual(
    tree.readTaskTreeState(
      new URLSearchParams(
        "taskTreeExpanded=-1,NaN,2,2,2147483648&taskTreePages=2:999,1:no",
      ),
      false,
    ),
    { expanded: [2], pages: { 2: 999 }, context: [] },
  );
});
test("sort is not a filter, child context keeps the same stable ordering and matching uses the original conditions", () => {
  const query = {
    q: "%API_",
    statuses: ["todo", "in_progress"],
    exclude_statuses: ["done"],
    sort: "updated_desc",
    page: 3,
    page_size: 20,
    assignee_id: 5,
  };
  assert.equal(
    tree.taskQueryHasFilters({ sort: "updated_desc", root_only: true }),
    false,
  );
  assert.equal(tree.taskQueryHasFilters(query), true);
  assert.deepEqual(tree.childTaskQuery(9, 2, query), {
    parent_task_id: 9,
    root_only: undefined,
    page: 2,
    page_size: 20,
    sort: "updated_desc",
  });
  assert.deepEqual(tree.childTaskQuery(9, 2, query, true), {
    ...query,
    parent_task_id: 9,
    root_only: undefined,
    page: 2,
    page_size: 20,
  });
  assert.equal(tree.branchCanMatch(9, { root_only: true }), false);
  assert.equal(tree.branchCanMatch(9, { parent_task_id: 8 }), false);
});

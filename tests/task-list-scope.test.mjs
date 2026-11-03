import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = ts.transpileModule(
  fs.readFileSync(
    new URL("../features/tasks/lib/task-list-scope.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  },
).outputText;
const scope = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

test("hierarchy navigation selects direct children, preserves filters and resets pagination", () => {
  const params = new URLSearchParams(
    "tab=board&q=決済&status=todo&page=4&returnTo=%2Fhome",
  );
  scope.setTaskListScopeParams(params, { kind: "children", parentTaskId: 67 });
  assert.deepEqual(scope.readTaskListScope(params), {
    kind: "children",
    parentTaskId: 67,
  });
  assert.deepEqual(
    scope.getTaskListScopeQuery(scope.readTaskListScope(params)),
    { parent_task_id: 67, root_only: undefined },
  );
  assert.equal(params.get("page"), null);
  assert.equal(params.get("q"), "決済");
  assert.equal(params.get("status"), "todo");
  assert.equal(params.get("tab"), "board");

  scope.setTaskListScopeParams(params, { kind: "roots" });
  assert.deepEqual(
    scope.getTaskListScopeQuery(scope.readTaskListScope(params)),
    { parent_task_id: undefined, root_only: true },
  );
  assert.equal(params.get("parentTaskId"), null);
  scope.setTaskListScopeParams(params, { kind: "all" });
  assert.deepEqual(scope.readTaskListScope(params), { kind: "all" });
  assert.equal(params.get("taskScope"), null);
});

test("invalid hierarchy URL cannot produce a malformed or contradictory API scope", () => {
  for (const value of ["", "0", "-1", "2.3", "foo", "2147483648"]) {
    const read = scope.readTaskListScope(
      new URLSearchParams({ taskScope: "children", parentTaskId: value }),
    );
    assert.deepEqual(read, { kind: "all" });
  }
  assert.deepEqual(
    scope.readTaskListScope(
      new URLSearchParams("taskScope=roots&parentTaskId=67"),
    ),
    { kind: "roots" },
  );
});

test("clearing search filters preserves the selected parent and view without legacy assignee defaults", () => {
  const params = new URLSearchParams(
    "taskScope=children&parentTaskId=67&tab=list&page=4&q=old&assignee=me&assigneeId=1&ganttAssigneeId=2&requirementId=9&ganttRequirementId=8&tag=ux&status=todo&statuses=todo&statuses=in_progress&excludeStatuses=done&hierarchy=parent&sort=code_asc&taskColumns=details",
  );
  scope.clearTaskListFilters(params);
  assert.equal(
    params.toString(),
    "taskScope=children&parentTaskId=67&tab=list&taskColumns=details",
  );
});

test("a parent outside the displayed page is identified by its actual response title", () => {
  const task = {
    id: 67,
    project_id: 5,
    parent_task_id: 26,
    parent_summary: {
      id: 26,
      title: "タスク計画を整える",
      task_code: "PHASE-4B",
    },
  };
  assert.deepEqual(
    scope.getTaskParentSummary(task, new Map()),
    task.parent_summary,
  );
  assert.equal(
    scope.getTaskParentSummary({ ...task, parent_summary: null }, new Map()),
    null,
  );
  assert.equal(
    scope.getTaskParentSummary(
      {
        ...task,
        parent_summary: { id: 999, title: "別の親", task_code: "OTHER" },
      },
      new Map(),
    ),
    null,
  );
  assert.equal(
    scope.getTaskParentSummary({ ...task, parent_task_id: null }, new Map()),
    null,
  );
  const parent = {
    id: 26,
    project_id: 5,
    title: "同じページの正しい名称",
    task_code: "CUSTOM",
  };
  assert.equal(
    scope.getTaskParentSummary(
      { ...task, parent_summary: null },
      new Map([[26, parent]]),
    ),
    parent,
  );
  assert.equal(
    scope.getTaskParentSummary(
      { ...task, parent_summary: null },
      new Map([[26, { ...parent, project_id: 6 }]]),
    ),
    null,
  );
});

test("parent selection resolves an existing readable task in the same project without synthesizing a code", () => {
  const current = {
    id: 26,
    project_id: 5,
    title: "画面全体を整理する",
    task_code: "UX-OVERVIEW",
  };
  assert.equal(scope.resolveTaskReference(5, 26, [null, current]), current);
  assert.equal(scope.resolveTaskReference(6, 26, [current]), null);
  assert.equal(scope.resolveTaskReference(5, 99, [current]), null);
  assert.equal(scope.resolveTaskReference(5, null, [current]), null);
  assert.equal(scope.resolveTaskReference(5, 26, [null, undefined]), null);
  assert.equal(scope.readTaskId("26"), 26);
  assert.equal(scope.readTaskId("not-an-id"), null);
});

test("individual status removal clears legacy and set aliases while preserving list context", () => {
  const params = new URLSearchParams(
    "status=todo&statuses=blocked&statuses=done&excludeStatuses=cancelled&page=3&q=申請&sort=code_asc&tab=list&taskTreeExpanded=10,20&taskSelection=30&taskColumns=details&taskProgress=hidden&returnTo=%2Fhome",
  );
  scope.clearTaskListFilter(params, "status");
  for (const key of ["status", "statuses", "excludeStatuses", "page"])
    assert.equal(params.has(key), false);
  assert.deepEqual(Object.fromEntries(params), {
    q: "申請",
    sort: "code_asc",
    tab: "list",
    taskTreeExpanded: "10,20",
    taskSelection: "30",
    taskColumns: "details",
    taskProgress: "hidden",
    returnTo: "/home",
  });
});

test("individual member and requirement removal cannot reactivate their old URL aliases", () => {
  const params = new URLSearchParams(
    "assigneeId=12&assignee=me&ganttAssigneeId=13&requirementId=21&ganttRequirementId=22&tag=検索QA&page=2",
  );
  scope.clearTaskListFilter(params, "assigneeId");
  for (const key of ["assigneeId", "assignee", "ganttAssigneeId", "page"])
    assert.equal(params.has(key), false);
  assert.equal(params.get("requirementId"), "21");
  scope.clearTaskListFilter(params, "requirementId");
  assert.equal(params.has("requirementId"), false);
  assert.equal(params.has("ganttRequirementId"), false);
  assert.equal(params.get("tag"), "検索QA");
});

test("individual date removal preserves other conditions and unknown controls cannot erase URL state", () => {
  const params = new URLSearchParams(
    "q=API&startDateFrom=2026-11-01&dueDateTo=2026-11-20&hierarchy=parent&sort=code_asc&page=2",
  );
  scope.clearTaskListFilter(params, "startDateFrom");
  assert.equal(params.has("startDateFrom"), false);
  assert.equal(params.get("dueDateTo"), "2026-11-20");
  assert.equal(params.get("hierarchy"), "parent");
  const current = params.toString();
  scope.clearTaskListFilter(params, "sort");
  assert.equal(params.toString(), current);
});

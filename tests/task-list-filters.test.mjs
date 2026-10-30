import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = ts.transpileModule(
  fs.readFileSync(
    new URL("../features/tasks/lib/task-list-filters.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  },
).outputText;
const filters = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

test("generated API serializes status arrays as repeated query parameters", async () => {
  const clientSource = fs.readFileSync(
    new URL("../lib/api/generated/tasks/tasks.ts", import.meta.url),
    "utf8",
  );
  const ast = ts.createSourceFile(
    "tasks.ts",
    clientSource,
    ts.ScriptTarget.Latest,
    true,
  );
  const statement = ast.statements.find(
    (node) =>
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.some(
        (declaration) =>
          declaration.name.getText(ast) ===
          "getListTasksProjectsProjectIdTasksGetUrl",
      ),
  );
  assert.ok(statement);
  const helper = ts.transpileModule(statement.getText(ast), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;
  const api = await import(
    `data:text/javascript;base64,${Buffer.from(helper).toString("base64")}`
  );
  const url = new URL(
    api.getListTasksProjectsProjectIdTasksGetUrl(5, {
      statuses: ["todo", "in_progress"],
      exclude_statuses: ["done", "cancelled"],
      hierarchy: "parent",
      page_size: 20,
    }),
    "http://local.invalid",
  );
  assert.deepEqual(url.searchParams.getAll("statuses"), [
    "todo",
    "in_progress",
  ]);
  assert.deepEqual(url.searchParams.getAll("exclude_statuses"), [
    "done",
    "cancelled",
  ]);
  assert.equal(url.searchParams.get("hierarchy"), "parent");
});

test("multiple statuses and exclusion presets survive URL round trips without dropping view or parent scope", () => {
  const params = new URLSearchParams(
    "tab=board&taskScope=children&parentTaskId=67&q=決済&page=4&status=todo&hierarchy=parent",
  );
  assert.deepEqual(filters.readTaskStatusFilter(params), {
    kind: "include",
    values: ["todo"],
  });
  filters.setTaskStatusFilterParams(params, {
    kind: "include",
    values: ["todo", "in_review", "todo"],
  });
  assert.deepEqual(params.getAll("statuses"), ["in_review", "todo"]);
  assert.equal(params.get("status"), null);
  assert.equal(params.get("page"), null);
  assert.equal(params.get("q"), "決済");
  assert.equal(params.get("parentTaskId"), "67");
  assert.equal(params.get("hierarchy"), "parent");
  assert.equal(params.get("tab"), "board");
  assert.deepEqual(
    filters.getTaskStatusQuery(filters.readTaskStatusFilter(params)),
    { statuses: ["in_review", "todo"], exclude_statuses: undefined },
  );
  filters.setTaskStatusFilterParams(params, {
    kind: "exclude",
    values: ["done", "cancelled"],
  });
  assert.deepEqual(
    filters.getTaskStatusQuery(filters.readTaskStatusFilter(params)),
    { statuses: undefined, exclude_statuses: ["cancelled", "done"] },
  );
  assert.equal(params.get("statuses"), null);
  filters.setTaskStatusFilterParams(params, { kind: "all" });
  assert.deepEqual(filters.readTaskStatusFilter(params), { kind: "all" });
  assert.equal(params.get("excludeStatuses"), null);
});

test("status selection describes done-only and done/cancelled exclusions distinctly", () => {
  const options = [
    { value: "todo", label: "未着手" },
    { value: "in_review", label: "レビュー中" },
    { value: "done", label: "完了" },
    { value: "cancelled", label: "中止" },
  ];
  const doneOnly = { kind: "exclude", values: ["done"] };
  assert.equal(filters.getTaskStatusFilterLabel(doneOnly, options), "完了以外");
  assert.deepEqual(filters.getSelectedTaskStatuses(doneOnly, options), [
    "todo",
    "in_review",
    "cancelled",
  ]);
  assert.equal(
    filters.getTaskStatusFilterLabel(
      { kind: "exclude", values: ["done", "cancelled"] },
      options,
    ),
    "完了・中止以外",
  );
  assert.equal(
    filters.getTaskStatusFilterLabel(
      { kind: "include", values: ["todo", "in_review"] },
      options,
    ),
    "未着手・レビュー中",
  );
  assert.deepEqual(
    filters.readTaskStatusFilter(new URLSearchParams("status=all")),
    { kind: "all" },
  );
});

test("hierarchy labels distinguish real child existence, intermediate parents and standalone tasks", () => {
  assert.equal(
    filters.getTaskHierarchyLabel({ parent_task_id: null, has_children: true }),
    "最上位の親タスク",
  );
  assert.equal(
    filters.getTaskHierarchyLabel({ parent_task_id: 26, has_children: true }),
    "中間の親タスク",
  );
  assert.equal(
    filters.getTaskHierarchyLabel({ parent_task_id: 26, has_children: false }),
    "末端の子タスク",
  );
  assert.equal(
    filters.getTaskHierarchyLabel({
      parent_task_id: null,
      has_children: false,
    }),
    "単独タスク",
  );
  assert.equal(filters.getTaskHierarchyLabel({ parent_task_id: null }), null);
  assert.equal(filters.readTaskHierarchyFilter("invalid"), "all");
  assert.equal(filters.readTaskHierarchyFilter("parent"), "parent");
});

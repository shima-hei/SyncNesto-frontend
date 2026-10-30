import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
const source = ts.transpileModule(
  fs.readFileSync(
    new URL("../features/tasks/lib/task-list-edit.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  },
).outputText;
const edit = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const task = {
  id: 10,
  project_id: 5,
  version: 3,
  status: "in_progress",
  assignee_id: 12,
  start_date: "2026-11-01",
  due_date: "2026-11-10",
  progress_percent: 30,
  estimated_minutes: 0,
  actual_minutes: null,
  estimated_basis: "rollup",
  actual_basis: "unreviewed",
  actual_start_date: null,
  actual_end_date: null,
};
const draft = (changes = {}, baseline = task) => ({
  baseline,
  values: { ...edit.getListEditValues(baseline), ...changes },
});

test("assignee or due-only changes use planning with only changed fields, protecting actuals, effort and state", () => {
  const before = structuredClone(task);
  assert.deepEqual(edit.toListEditMutation(draft({ dueDate: "2026-11-12" })), {
    contract: "planning",
    data: { version: 3, due_date: "2026-11-12" },
  });
  assert.deepEqual(edit.toListEditMutation(draft({ assigneeId: "" })), {
    contract: "planning",
    data: { version: 3, assignee_id: null },
  });
  assert.deepEqual(task, before);
});
test("explicit status changes use the established Task contract and done adds progress100 only for that Task", () => {
  assert.deepEqual(
    edit.toListEditMutation(draft({ status: "done", dueDate: "" })),
    {
      contract: "task",
      data: {
        version: 3,
        due_date: null,
        status: "done",
        progress_percent: 100,
      },
    },
  );
  assert.deepEqual(edit.toListEditMutation(draft({ status: "blocked" })), {
    contract: "task",
    data: { version: 3, status: "blocked" },
  });
});
test("unchanged done values never invoke a status transition in a due-only edit", () => {
  const row = draft(
    { dueDate: "2026-11-14" },
    { ...task, status: "done", progress_percent: 100 },
  );
  assert.equal(edit.toListEditMutation(row).contract, "planning");
  assert.deepEqual(Object.keys(edit.toListEditMutation(row).data).sort(), [
    "due_date",
    "version",
  ]);
});
test("rebase keeps unrelated concurrent edits and resends only local differences with the new version", () => {
  const current = {
    ...task,
    version: 4,
    assignee_id: 44,
    progress_percent: 51,
    actual_start_date: "2026-11-02",
  };
  const rebased = edit.rebaseListEdit(
    draft({ dueDate: "2026-11-13" }),
    current,
  );
  assert.equal(rebased.values.assigneeId, "44");
  assert.deepEqual(edit.toListEditMutation(rebased), {
    contract: "planning",
    data: { version: 4, due_date: "2026-11-13" },
  });
  assert.equal(rebased.baseline.actual_start_date, "2026-11-02");
});
test("intent already reflected in latest state is recognized without proving a particular request succeeded", () => {
  const row = draft({ dueDate: "2026-11-13" });
  assert.equal(
    edit.isListEditReflected(row, {
      ...task,
      version: 4,
      due_date: "2026-11-13",
      assignee_id: 88,
    }),
    true,
  );
  assert.equal(
    edit.isListEditReflected(row, { ...task, due_date: "2026-11-14" }),
    false,
  );
  assert.equal(
    edit.isListEditReflected(row, {
      ...task,
      project_id: 6,
      due_date: "2026-11-13",
    }),
    false,
  );
});
test("date validation rejects new invalid intervals but preserves unrelated legacy dates and supports explicit null", () => {
  assert.match(edit.validateListEdit(draft({ dueDate: "2026-02-30" })), /期限/);
  assert.match(
    edit.validateListEdit(draft({ dueDate: "2026-10-31" })),
    /開始日/,
  );
  assert.equal(
    edit.validateListEdit(
      draft({ assigneeId: "14" }, { ...task, due_date: "2026-10-01" }),
    ),
    null,
  );
  assert.equal(edit.validateListEdit(draft({ dueDate: "" })), null);
  assert.match(edit.validateListEdit(draft({ assigneeId: "-1" })), /担当/);
});
test("stored drafts reject foreign projects, mismatched IDs, malformed values and invalid versions", () => {
  const rows = edit.readListEditDrafts(
    {
      10: { ...draft({ dueDate: "" }), uncertain: true },
      11: draft(),
      12: draft({}, { ...task, id: 12, project_id: 6 }),
      13: draft({}, { ...task, id: 13, version: 0 }),
      14: { baseline: { ...task, id: 14 }, values: {} },
    },
    5,
  );
  assert.deepEqual(Object.keys(rows), ["10"]);
  assert.equal(rows[10].uncertain, true);
});

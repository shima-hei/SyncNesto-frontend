import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = ts.transpileModule(
  fs.readFileSync(
    new URL("../features/tasks/lib/task-planning.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  },
).outputText;
const planning = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const task = {
  id: 7,
  project_id: 5,
  version: 3,
  assignee_id: 2,
  start_date: "2026-10-29",
  due_date: "2026-10-30",
  estimated_minutes: 90,
  estimated_basis: "rollup",
  actual_start_date: null,
  progress_percent: 40,
};
const draft = (changes) => ({
  baseline: task,
  values: { ...planning.getTaskPlanningValues(task), ...changes },
});

test("planning distinguishes omission, explicit null and zero without writing actuals or basis", () => {
  assert.deepEqual(
    planning.toTaskPlanningUpdate(
      draft({ estimatedMinutes: "0", dueDate: "", assigneeId: "" }),
    ),
    {
      version: 3,
      estimated_minutes: 0,
      due_date: null,
      assignee_id: null,
    },
  );
  assert.deepEqual(
    planning.toTaskPlanningUpdate(draft({ estimatedMinutes: "" })),
    { version: 3, estimated_minutes: null },
  );
  assert.deepEqual(
    planning.toTaskPlanningUpdate(draft({ startDate: "2026-10-28" })),
    { version: 3, start_date: "2026-10-28" },
  );
});

test("planning keeps raw invalid input for correction and only validates date ordering when changed", () => {
  for (const value of ["-1", "1.5", "1e3", "2147483648", "9007199254740993"])
    assert.ok(
      planning.getPlanningValidation(draft({ estimatedMinutes: value }).values),
    );
  for (const value of ["0", "", "90"])
    assert.equal(
      planning.getPlanningValidation(draft({ estimatedMinutes: value }).values),
      null,
    );
  const reversed = draft({ startDate: "2026-11-01" }).values;
  assert.ok(planning.getPlanningValidation(reversed, true));
  assert.equal(planning.getPlanningValidation(reversed, false), null);
  assert.equal(
    planning.getPlanningValidation(draft({ dueDate: "" }).values),
    null,
  );
});

test("three-way reconciliation keeps unrelated current changes and only reapplies local edits", () => {
  const current = {
    ...task,
    version: 4,
    assignee_id: 8,
    estimated_minutes: 120,
  };
  const original = draft({ dueDate: "2026-11-03" });
  assert.deepEqual(planning.mergePlanningValues(original, current), {
    assigneeId: "8",
    startDate: "2026-10-29",
    dueDate: "2026-11-03",
    estimatedMinutes: "120",
  });
  assert.equal(original.baseline.version, 3);
  assert.equal(planning.isPlanningDirty(original), true);
  assert.equal(planning.isPlanningDirty(draft({})), false);
});

test("unknown outcomes reconcile changed fields without requiring unrelated fields to match", () => {
  const unknown = draft({ dueDate: "2026-11-03", estimatedMinutes: "0" });
  assert.equal(
    planning.isPlanningReflected(unknown, {
      ...task,
      assignee_id: 9,
      due_date: "2026-11-03",
      estimated_minutes: 0,
    }),
    true,
  );
  assert.equal(
    planning.isPlanningReflected(unknown, { ...task, due_date: "2026-11-03" }),
    false,
  );
});

test("restoration separates planning scope and rejects foreign or malformed records", () => {
  assert.notEqual(planning.getPlanningDraftScope(5), "task:5:edit:7");
  const valid = draft({ dueDate: "" });
  const restored = planning.readPlanningDrafts(
    {
      7: valid,
      8: { ...valid, baseline: { ...task, id: 8, project_id: 6 } },
      9: { baseline: { ...task, id: 9 }, values: {} },
      10: null,
    },
    5,
  );
  assert.deepEqual(Object.keys(restored), ["7"]);
  assert.equal(restored[7].baseline.version, 3);
  const overlaid = planning.overlayPlanningTask(task, valid.values);
  assert.equal(overlaid.id, task.id);
  assert.equal(overlaid.due_date, null);
  assert.equal(overlaid.actual_start_date, null);
  assert.equal(overlaid.estimated_basis, "rollup");
});

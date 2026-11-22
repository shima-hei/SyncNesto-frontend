import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

async function load(path) {
  const source = ts.transpileModule(
    fs.readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
    },
  ).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  );
}
const mapper = await load("../features/tasks/lib/task-mappers.ts");
const draft = await load("../features/tasks/lib/task-form-draft.ts");
const scope = await load("../features/tasks/lib/task-view-scope.ts");
const effort = await load("../features/tasks/lib/task-effort.ts");
const phaseOptions = await load("../features/tasks/lib/task-phase-options.ts");

test("only the persisted archived phase can be reselected before saving", () => {
  const phases = [
    { id: 9, name: "設計", archived_at: "2026-10-29T00:00:00Z" },
    { id: 10, name: "旧工程", archived_at: "2026-10-29T00:00:00Z" },
    { id: 11, name: "検証", archived_at: null },
  ];
  const editing = phaseOptions.getTaskPhaseOptions(
    phases,
    "phase:11",
    "phase:9",
  );
  assert.equal(
    editing.find((item) => item.value === "phase:9").disabled,
    false,
  );
  assert.equal(
    editing.find((item) => item.value === "phase:10").disabled,
    true,
  );
  const creating = phaseOptions.getTaskPhaseOptions(phases, "phase:9");
  assert.equal(
    creating.find((item) => item.value === "phase:9").disabled,
    true,
  );
  const anotherPage = phaseOptions.getTaskPhaseOptions(
    [],
    "unclassified",
    "phase:9",
  );
  assert.ok(anotherPage.some((item) => item.value === "phase:9"));
});

test("phase and effort metadata are omitted from unrelated updates and old drafts", () => {
  const task = {
    id: 1,
    project_id: 2,
    version: 3,
    task_code: "MANUAL",
    title: "Before",
    phase_scope: "phase",
    phase_id: 9,
    estimated_basis: "unreviewed",
    actual_basis: "rollup",
  };
  const values = mapper.getTaskFormValues(task);
  assert.deepEqual(
    mapper.toTaskUpdate({ ...values, title: "After" }, 3, task),
    { version: 3, title: "After" },
  );
  const old = { ...values };
  for (const key of ["phaseAssignment", "estimatedBasis", "actualBasis"])
    delete old[key];
  const restored = draft.mergeTaskFormDraft(
    { initialValues: old, values: { ...old, title: "Draft" } },
    values,
  );
  assert.equal(restored.phaseAssignment, "phase:9");
  assert.equal(restored.estimatedBasis, "unreviewed");
  assert.deepEqual(
    mapper.toTaskUpdate(
      { ...values, phaseAssignment: "unclassified" },
      3,
      task,
    ),
    { version: 3, phase_assignment: { kind: "unclassified", phase_id: null } },
  );
});

test("effort distinguishes explicit zero, missing and unreviewed values", () => {
  assert.equal(
    effort.formatEffortMetric({
      minutes: 0,
      complete: true,
      missing_count: 0,
      unreviewed_count: 0,
    }),
    "0 分",
  );
  const partial = effort.formatEffortMetric({
    minutes: 120,
    complete: false,
    missing_count: 1,
    unreviewed_count: 2,
  });
  assert.match(partial, /確認済み小計 120 分/);
  assert.match(partial, /未入力1件・未確認2件/);
  assert.equal(
    effort.taskPhaseLabel({
      phase_scope: "phase",
      phase_name: "設計",
      phase_archived: true,
    }),
    "設計（アーカイブ済み）",
  );
});

test("board distinguishes the 100-item boundary, hidden cards, and incomplete results", () => {
  const rows = Array.from({ length: 100 }, () => ({ status: "todo" }));
  rows[0].status = "done";
  rows[1].status = "cancelled";
  rows[2].status = "legacy";
  const result = scope.getBoardTaskScope(rows, 100, true, [
    "todo",
    "done",
    "cancelled",
  ]);
  assert.deepEqual(result, {
    overLimit: false,
    complete: true,
    folded: 2,
    unknown: 1,
    visible: 97,
  });
  assert.equal(
    scope.getBoardTaskScope(rows, 101, true, ["todo"]).overLimit,
    true,
  );
  assert.equal(
    scope.getBoardTaskScope(rows.slice(0, 20), 27, false, ["todo"]).complete,
    false,
  );
  assert.equal(scope.getBoardTaskScope([], 0, true, ["todo"]).complete, true);
});

test("name-only creation uses the adopted defaults and omits the automatic code", () => {
  const body = mapper.toTaskCreate({
    ...mapper.defaultTaskFormValues,
    title: "  確認する  ",
  });
  assert.equal(body.title, "確認する");
  assert.equal(body.task_type, "other");
  assert.equal(body.status, "backlog");
  assert.equal(body.priority, "medium");
  assert.equal(body.progress_percent, 0);
  assert.equal(body.assignee_id, null);
  assert.equal(body.due_date, null);
  assert.equal(Object.hasOwn(body, "task_code"), false);
});

test("renaming preserves hidden legacy values and all requirement relations", () => {
  const current = {
    id: 9,
    version: 3,
    task_code: "MANUAL-KEEP",
    title: "before",
    description: "hidden",
    task_type: "backend",
    status: "in_review",
    priority: "high",
    parent_task_id: 2,
    assignee_id: 4,
    reporter_id: 5,
    start_date: "2026-10-27",
    due_date: "2026-10-30",
    actual_start_date: "2026-10-26",
    actual_end_date: null,
    progress_percent: 40,
    estimated_minutes: 90,
    actual_minutes: 30,
    sort_order: 50,
    tags: ["keep"],
    requirements: [
      { id: 7, relation_type: "tests" },
      { id: 8, relation_type: "implements" },
    ],
  };
  assert.deepEqual(
    mapper.toTaskUpdate(
      { ...mapper.getTaskFormValues(current), title: "after" },
      3,
      current,
    ),
    { version: 3, title: "after" },
  );
  const legacy = { ...current, task_type: null, status: null, priority: null };
  assert.deepEqual(
    mapper.toTaskUpdate(
      { ...mapper.getTaskFormValues(legacy), title: "after" },
      3,
      legacy,
    ),
    { version: 3, title: "after" },
  );
});

test("restoring applies only draft edits over the latest hidden values", () => {
  const initial = {
    ...mapper.defaultTaskFormValues,
    title: "original",
    priority: "low",
  };
  const saved = {
    initialValues: initial,
    values: {
      ...initial,
      title: "unsaved",
      taskCode: "MANUAL-NEW",
      parentTaskId: "4",
      requirementId: "7",
      relationType: "tests",
    },
  };
  const restored = draft.mergeTaskFormDraft(saved, {
    ...initial,
    priority: "high",
    assigneeId: "8",
  });
  assert.equal(restored.title, "unsaved");
  assert.equal(restored.priority, "high");
  assert.equal(restored.assigneeId, "8");
  const payload = mapper.toTaskCreate(restored);
  assert.equal(payload.task_code, "MANUAL-NEW");
  assert.equal(payload.parent_task_id, 4);
  assert.equal(payload.requirement_id, 7);
  assert.equal(payload.relation_type, "tests");
});

test("draft scopes isolate projects, create contexts, and edit resources", () => {
  const initial = mapper.defaultTaskFormValues;
  const keys = [
    draft.getTaskFormDraftScope(1, "create", initial),
    draft.getTaskFormDraftScope(2, "create", initial),
    draft.getTaskFormDraftScope(1, "create", { ...initial, parentTaskId: "9" }),
    draft.getTaskFormDraftScope(1, "create", {
      ...initial,
      requirementId: "9",
    }),
    draft.getTaskFormDraftScope(1, "update", initial, 9),
  ];
  assert.equal(new Set(keys).size, keys.length);
});

test("a saved response may remount the form before draft cleanup without prompting to restore saved input", () => {
  const initial = { ...mapper.defaultTaskFormValues, title: "before" };
  const values = { ...initial, title: "saved title", priority: "high" };
  const stored = { initialValues: initial, values };
  const current = { ...values, assigneeId: "8", progressPercent: "100" };
  assert.equal(draft.hasUnreflectedTaskFormDraft(stored, current), false);
  assert.equal(draft.hasUnreflectedTaskFormDraft(stored, initial), true);
  // 保存失敗・競合や、追加の未保存変更がある場合は復元を残す。
  assert.equal(
    draft.hasUnreflectedTaskFormDraft(stored, { ...current, priority: "low" }),
    true,
  );
  assert.equal(
    draft.hasUnreflectedTaskFormDraft(
      {
        ...stored,
        values: { ...values, description: "unsaved notes" },
      },
      current,
    ),
    true,
  );
});

test("workbench totals count own work once and preserve explicit zero across phase and date filters", async () => {
  const { sumMeasure, filterEffortTasks, initialEffortFilter, hasEffortIssue } =
    await load("../features/tasks/lib/effort-workspace.ts");
  const parent = {
    id: 1,
    task_code: "P",
    title: "親",
    estimated_basis: "rollup",
    estimated_minutes: 600,
    actual_basis: "rollup",
    actual_minutes: 200,
    status: "done",
    remaining_minutes: 120,
  };
  const child = {
    id: 2,
    parent_task_id: 1,
    task_code: "C",
    title: "子",
    phase_scope: "phase",
    phase_id: 7,
    start_date: "2026-11-01",
    due_date: "2026-11-18",
    estimated_basis: "own",
    estimated_minutes: 0,
    actual_basis: "own",
    actual_minutes: 5,
    planned_minutes: 0,
    remaining_minutes: 0,
  };
  const missing = {
    ...child,
    id: 3,
    start_date: null,
    due_date: null,
    estimated_minutes: null,
    actual_minutes: null,
  };
  const pending = {
    ...child,
    id: 4,
    estimated_basis: "unreviewed",
    estimated_minutes: 80,
  };
  const tasks = [parent, child, missing, pending];
  assert.deepEqual(sumMeasure(tasks, "estimated"), {
    minutes: 0,
    entered: 1,
    missing: 1,
    unreviewed: 1,
  });
  assert.deepEqual(sumMeasure(tasks, "remaining"), {
    minutes: 0,
    entered: 3,
    missing: 0,
    unreviewed: 0,
  });
  assert.equal(hasEffortIssue(parent, "over"), false);
  assert.equal(hasEffortIssue(child, "over"), true);
  assert.deepEqual(
    filterEffortTasks(
      tasks,
      { ...initialEffortFilter, issue: "missing" },
      () => "",
    ),
    [missing],
  );
  assert.deepEqual(
    filterEffortTasks(
      tasks,
      {
        ...initialEffortFilter,
        phase: "7",
        from: "2026-11-18",
        to: "2026-11-18",
      },
      () => "",
    ),
    [child, pending],
  );
});

test("method previews round once and distinguish missing, zero and overflow", async () => {
  const { calculateEstimate, estimateFormValues, parseEstimateHours } =
    await load("../features/tasks/lib/task-estimate.ts");
  assert.equal(parseEstimateHours("1.025"), 62);
  assert.equal(parseEstimateHours("1.024999999999999999"), 61);
  assert.equal(parseEstimateHours("0"), 0);
  assert.equal(parseEstimateHours(""), null);
  const draft = estimateFormValues({ task_version: 1, method: "parametric" });
  const product = (quantity, unitHours) =>
    calculateEstimate({ ...draft, quantity, unitHours }).minutes;
  assert.equal(product("", "0"), null);
  assert.equal(product("0", "0.03"), 0);
  assert.equal(product("2.5", "0.03"), 5);
  assert.equal(product("10000", "0.0001"), 60);
  assert.equal(product("99999999", "99999999"), null);
  const analog = calculateEstimate({
    ...draft,
    method: "analogous",
    referenceWork: " 調査 ",
    referenceHours: "0.25",
    factor: "1.1",
  });
  assert.deepEqual(analog, {
    minutes: 17,
    inputs: { reference_work: "調査", reference_minutes: 15, factor: "1.1" },
  });
});

test("worksheet ranges preserve quoted references and reject stale or uneven rectangles", async () => {
  const { bounds, fromTsv, toTsv } = await load(
    "../features/tasks/lib/estimate-worksheet-range.ts",
  );
  const matrix = [
    ['見積根拠\t"初版"\n翌日', "0", "1.25"],
    ["", "2", "3"],
  ];
  assert.deepEqual(fromTsv(toTsv(matrix) + "\r\n"), matrix);
  assert.throws(() => fromTsv("1\t2\n3"));
  assert.throws(() => fromTsv('"閉じていない'));
  const first = { id: 8, field: "optimistic" },
    last = { id: 4, field: "pessimistic" };
  const fields = ["optimistic", "likely", "pessimistic"];
  assert.deepEqual(bounds([8, 4], fields, last, first), {
    top: 0,
    bottom: 1,
    left: 0,
    right: 2,
  });
  assert.equal(bounds([8], fields, first, last), null);
});

test("restored planning fields are excluded from task entry and section saves", () => {
  const current = {
    id: 7,
    version: 4,
    title: "既存",
    task_code: "TASK-007",
    actual_minutes: 30,
    estimated_minutes: 90,
  };
  const values = {
    ...mapper.getTaskFormValues(current),
    title: "改名",
    actualMinutes: "0",
    estimatedMinutes: "",
    estimatedBasis: "rollup",
  };
  const created = mapper.toTaskCreate(values);
  for (const field of [
    "actual_minutes",
    "estimated_minutes",
    "actual_start_date",
    "actual_end_date",
    "estimated_basis",
    "actual_basis",
  ]) {
    assert.equal(Object.hasOwn(created, field), false);
  }
  const patch = (section, input) =>
    mapper.toTaskUpdate(
      mapper.taskSectionValues(section, current, input),
      4,
      current,
    );
  assert.deepEqual(patch("title", values), { version: 4, title: "改名" });
  assert.deepEqual(patch("actual", values), { version: 4, actual_minutes: 0 });
  assert.deepEqual(patch("actual", { ...values, actualMinutes: "" }), {
    version: 4,
    actual_minutes: null,
  });
});

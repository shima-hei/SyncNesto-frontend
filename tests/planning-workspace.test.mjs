import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

async function load(name) {
  const { outputText } = ts.transpileModule(
    fs.readFileSync(
      new URL(`../features/tasks/lib/${name}.ts`, import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
    },
  );
  return import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  );
}

const { groupPlanningTasks } = await load("planning-phases");
const { getPlanningHref } = await load("planning-route");

test("ガントの旧入口から計画に期間・担当・要件・概要の戻り先を引き継ぐ", () => {
  const query = new URLSearchParams({
    tab: "gantt",
    ganttStartDate: "2026-11-01",
    ganttEndDate: "2026-11-30",
    ganttRangeMode: "custom",
    ganttDisplayUnit: "week",
    ganttAssigneeId: "8",
    ganttRequirementId: "12",
    overviewReturn: "/projects/joined/7?overviewView=schedule",
    q: "一覧の検索語",
    status: "todo",
  });
  const url = new URL(getPlanningHref(7, query), "https://syncnesto.invalid");
  assert.equal(url.pathname, "/projects/joined/7/planning");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    ganttStartDate: "2026-11-01",
    ganttEndDate: "2026-11-30",
    ganttRangeMode: "custom",
    ganttDisplayUnit: "week",
    assigneeId: "8",
    requirementId: "12",
    overviewReturn: "/projects/joined/7?overviewView=schedule",
  });
  assert.equal(
    getPlanningHref(7, new URLSearchParams("assignee=me")),
    "/projects/joined/7/planning?assignee=me",
  );
  assert.equal(
    getPlanningHref(
      7,
      new URLSearchParams("assignee=me&assigneeId=&ganttAssigneeId=8"),
    ),
    "/projects/joined/7/planning?assigneeId=",
  );
});

test("既存の親子・工程順を保持して工程、共通、未分類に一度ずつまとめる", () => {
  const tasks = [
    { id: 1, phase_scope: "unclassified", start_date: "2026-11-16" },
    { id: 2, phase_scope: "phase", phase_id: 3, parent_task_id: 1 },
    { id: 3, phase_scope: "shared" },
    { id: 4, phase_scope: "phase", phase_id: 2 },
    { id: 5, phase_scope: "phase", phase_id: 3 },
    { id: 6 },
    { id: 7, phase_scope: "phase", phase_id: 9 },
  ];
  const groups = groupPlanningTasks(tasks, [
    { id: 3, name: "設計" },
    { id: 2, name: "検証", archived_at: "2026-11-12" },
  ]);
  assert.deepEqual(
    groups.map(({ label, tasks }) => [label, tasks.map(({ id }) => id)]),
    [
      ["設計", [2, 5]],
      ["検証（アーカイブ済み）", [4]],
      ["共通作業", [3]],
      ["未分類", [1, 6]],
      ["工程 #9", [7]],
    ],
  );
  assert.equal(groups[0].tasks[0], tasks[1]);
});

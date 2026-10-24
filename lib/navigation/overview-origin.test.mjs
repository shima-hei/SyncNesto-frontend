import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const code = ts.transpileModule(
  readFileSync(new URL("./overview-origin.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const {
  safeOverviewReturn,
  withOverviewOrigin,
  readTraceParams,
  readScheduleParams,
} = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
const base = "https://syncnesto.invalid";
const origin =
  "/projects/joined/7?traceDocument=9&traceQ=受付&traceStatus=draft&tracePage=3&selectedRequirement=12";
test("要件・設計・作業・テスト・承認と概要の条件/選択を往復", () => {
  for (const leaf of [
    "requirements/9/items/12",
    "specifications/15",
    "tasks/18",
    "test-designs/19",
    "fixed-approvals?targetKind=requirement&sourceId=12",
  ]) {
    const href = withOverviewOrigin(`/projects/joined/7/${leaf}`, 7, origin);
    assert.equal(
      safeOverviewReturn(
        new URL(href, base).searchParams.get("overviewReturn"),
        7,
      ),
      origin.replace("受付", encodeURIComponent("受付")),
    );
  }
});
test("日程の期間/独立ページ/要件条件をガントと詳細から復帰し不正日付を除外", () => {
  const source =
    "/projects/joined/7?overviewView=schedule&traceQ=受付&tracePage=2&schedulePage=3&commonPage=2&scheduleStart=2028-02-29&scheduleEnd=2028-04-23";
  const href = withOverviewOrigin(
    "/projects/joined/7/tasks?tab=gantt&ganttRequirementId=12",
    7,
    source,
  );
  const url = new URL(href, base);
  assert.equal(url.searchParams.get("tab"), "gantt");
  const restored = new URL(url.searchParams.get("overviewReturn"), base)
    .searchParams;
  assert.equal(restored.get("traceQ"), "受付");
  assert.equal(restored.get("tracePage"), "2");
  assert.deepEqual(readScheduleParams(restored), {
    view: "schedule",
    start: "2028-02-29",
    end: "2028-04-23",
    page: 3,
    commonPage: 2,
  });
  for (const date of [
    "2027-02-29",
    "2028-13-01",
    "0000-01-01",
    "2028-02-29T00:00:00Z",
  ]) {
    assert.equal(
      readScheduleParams(new URLSearchParams({ scheduleStart: date })).start,
      null,
    );
  }
});
test("外部/別案件/不正ID/過長/入れ子を受け付けない", () => {
  for (const value of [
    "https://evil.test/projects/joined/7",
    "//evil.test/projects/joined/7",
    "javascript:alert(1)",
    "/projects/joined/8",
    "/projects/joined/7/tasks",
    "/projects/joined/7\\evil",
    "x".repeat(4097),
  ])
    assert.equal(safeOverviewReturn(value, 7), null);
  assert.equal(
    safeOverviewReturn(
      "/projects/joined/7?returnTo=https://evil.test&selectedRequirement=-1&tracePage=Infinity",
      7,
    ),
    "/projects/joined/7",
  );
  assert.equal(
    readTraceParams(
      new URLSearchParams(
        "selectedRequirement=9007199254740992&traceDocument=NaN",
      ),
    ).selected,
    null,
  );
});
test("既存Task起点/専門画面のqueryとanchorを保持し許可外に付与しない", () => {
  const url = new URL(
    withOverviewOrigin(
      "/projects/joined/7/requirements/9/items/12?originTask=18&originProject=7&tab=relations#designs",
      7,
      origin,
    ),
    base,
  );
  assert.equal(url.searchParams.get("originTask"), "18");
  assert.equal(url.hash, "#designs");
  assert.equal(url.searchParams.get("tab"), "relations");
  for (const href of [
    "/projects/joined/8/tasks/18",
    "https://evil.test/",
    "/projects/joined/7/tasks/18/edit",
  ])
    assert.equal(withOverviewOrigin(href, 7, origin), href);
});

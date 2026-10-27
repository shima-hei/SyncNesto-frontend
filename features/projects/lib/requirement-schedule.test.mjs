import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const code = ts.transpileModule(
  readFileSync(new URL("./requirement-schedule.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const { scheduleWeeks, schedulePlacement, shiftScheduleWindow } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
test("週表示は閏日/年越しを日付だけで扱い最大12週", () => {
  assert.deepEqual(scheduleWeeks("2028-02-28", "2028-03-12"), [
    "2028-02-28",
    "2028-03-06",
  ]);
  assert.deepEqual(shiftScheduleWindow("2026-12-28", "2027-01-10", 1), {
    start: "2027-01-11",
    end: "2027-01-24",
  });
  assert.equal(scheduleWeeks("2027-01-01", "2027-12-31").length, 12);
  assert.equal(shiftScheduleWindow("9999-12-01", "9999-12-31", 1), null);
});
test("未日程/不正期間/期間外を隠さず、境界をまたぐ予定は表示範囲に収める", () => {
  const place = (a, b) => schedulePlacement(a, b, "2026-10-19", "2026-12-13");
  assert.equal(place(null, "2026-11-01").label, "期間未確定");
  assert.equal(place("2026-11-01", null).label, "期間未確定");
  assert.equal(place("2026-11-02", "2026-11-01").label, "日程を確認");
  assert.equal(place("2026-10-01", "2026-10-18").label, "表示期間より前");
  assert.equal(place("2026-12-14", "2026-12-15").label, "表示期間より後");
  assert.equal(place("2026-10-18", "2026-10-19").column, "1 / 2");
  assert.equal(place("2026-12-13", "2026-12-15").column, "8 / 9");
});

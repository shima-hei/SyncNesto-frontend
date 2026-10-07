import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = ts.transpileModule(
  fs.readFileSync(
    new URL("../features/audit-logs/lib/audit-log.ts", import.meta.url),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const loaded = { exports: {} };
new Function("module", "exports", source)(loaded, loaded.exports);
const { auditParams, EMPTY_FILTERS, eventLabel } = loaded.exports;

test("監査検索の終了日は、夏時間の切り替わる日でも翌日の現地午前0時になる", () => {
  const before = process.env.TZ;
  process.env.TZ = "America/New_York";
  try {
    const params = auditParams({
      ...EMPTY_FILTERS,
      from: "2026-03-08",
      to: "2026-03-08",
      actor: "12",
      project: "3",
      event: " task.updated ",
    });
    assert.equal(params.created_from, "2026-03-08T05:00:00.000Z");
    assert.equal(params.created_before, "2026-03-09T04:00:00.000Z");
    assert.equal(params.actor_user_id, 12);
    assert.equal(params.project_id, 3);
    assert.equal(params.event_type, "task.updated");
  } finally {
    if (before === undefined) delete process.env.TZ;
    else process.env.TZ = before;
  }
});

test("不正なID・存在しない日付・逆転した期間を送信せず、未知の操作種別も失わない", () => {
  for (const actor of ["0", "-1", "1e3", "2147483648"])
    assert.throws(() => auditParams({ ...EMPTY_FILTERS, actor }));
  assert.throws(() => auditParams({ ...EMPTY_FILTERS, from: "2026-02-30" }));
  assert.throws(() =>
    auditParams({ ...EMPTY_FILTERS, from: "2026-10-09", to: "2026-10-08" }),
  );
  assert.equal(auditParams(EMPTY_FILTERS).created_before, undefined);
  assert.equal(eventLabel("future.operation"), "future.operation");
  assert.equal(eventLabel("constructor"), "constructor");
});

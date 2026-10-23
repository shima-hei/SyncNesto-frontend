import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function childEnvironment(report) {
  const env = { ...process.env, SYNCNESTO_TEST_REPORT: report };
  delete env.NODE_TEST_CONTEXT;
  return env;
}

test("reporter preserves failing assertions and nonzero exit without flooding stdout", () => {
  const folder = mkdtempSync(resolve(tmpdir(), "syncnesto-reporter-"));
  try {
    const target = resolve(folder, "case.test.mjs");
    const report = resolve(folder, "report.json");
    writeFileSync(
      target,
      "import test from 'node:test'; import assert from 'node:assert/strict'; test('regression',()=>assert.equal(1,2));",
    );
    const result = spawnSync(
      process.execPath,
      ["--test", "--test-reporter=./scripts/test-reporter.mjs", target],
      {
        cwd: resolve(import.meta.dirname, ".."),
        encoding: "utf8",
        env: childEnvironment(report),
      },
    );
    assert.notEqual(result.status, 0);
    const data = JSON.parse(readFileSync(report, "utf8"));
    assert.equal(data.status, "failed");
    assert.equal(data.complete, true);
    assert.equal(data.counts.failed, 1);
    assert.match(data.failures[0].error, /AssertionError/);
    assert.ok(Buffer.byteLength(result.stdout) < 8000);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test("reporter does not count a skipped case as passed", () => {
  const folder = mkdtempSync(resolve(tmpdir(), "syncnesto-reporter-"));
  try {
    const target = resolve(folder, "case.test.mjs");
    const report = resolve(folder, "report.json");
    writeFileSync(
      target,
      "import test from 'node:test'; test.skip('not run',()=>{}); test('ran',()=>{});",
    );
    const result = spawnSync(
      process.execPath,
      ["--test", "--test-reporter=./scripts/test-reporter.mjs", target],
      {
        cwd: resolve(import.meta.dirname, ".."),
        encoding: "utf8",
        env: childEnvironment(report),
      },
    );
    assert.equal(result.status, 0);
    const data = JSON.parse(readFileSync(report, "utf8"));
    assert.equal(data.counts.passed, 1);
    assert.equal(data.counts.skipped, 1);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

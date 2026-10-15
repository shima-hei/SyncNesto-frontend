import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const { outputText } = ts.transpileModule(
  readFileSync(new URL("./list-return.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  },
);
const { safeListReturn, withListReturn } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const fallback = "/projects/joined/1/tasks?tab=list";
test("一覧の検索と表示状態を維持", () =>
  assert.equal(
    safeListReturn(
      "/projects/joined/1/tasks?tab=board&q=login&status=todo",
      fallback,
    ),
    "/projects/joined/1/tasks?tab=board&q=login&status=todo",
  ));
test("外部URLと別Projectへの戻り先を拒否", () => {
  for (const value of [
    "https://evil.test/projects/joined/1/tasks",
    "javascript:alert(1)",
    "/projects/joined/2/tasks",
    "/projects/joined/1/tasks/3",
  ])
    assert.equal(safeListReturn(value, fallback), fallback);
});
test("既存パラメータとアンカーを壊さない", () => {
  const url = new URL(
    withListReturn("/projects/joined/1/tasks/2?edit=1#review", fallback),
    "https://syncnesto.invalid",
  );
  assert.equal(url.searchParams.get("returnTo"), fallback);
  assert.equal(url.searchParams.get("edit"), "1");
  assert.equal(url.hash, "#review");
});

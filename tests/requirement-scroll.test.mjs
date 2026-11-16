import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import ts from "typescript";

test("要件へのスクロールは操作時の動きの設定に合わせて移動する", () => {
  const source = ts.transpileModule(
    fs.readFileSync(
      new URL(
        "../features/requirements/lib/scroll-to-requirement-content.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const loaded = { exports: {} };
  let motionAllowed = true;
  const browser = {
    matchMedia(query) {
      assert.equal(query, "(prefers-reduced-motion: no-preference)");
      return { matches: motionAllowed };
    },
  };
  new Function("module", "exports", "window", source)(
    loaded,
    loaded.exports,
    browser,
  );
  const { scrollToRequirementContent } = loaded.exports;
  const calls = [];
  const element = { scrollIntoView: (options) => calls.push(options) };

  scrollToRequirementContent(element);
  motionAllowed = false;
  scrollToRequirementContent(element);
  scrollToRequirementContent(null);

  assert.deepEqual(calls, [
    { behavior: "smooth", block: "center" },
    { behavior: "instant", block: "center" },
  ]);
});

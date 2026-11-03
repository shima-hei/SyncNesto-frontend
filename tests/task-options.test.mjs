import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = ts.transpileModule(
  fs.readFileSync(
    new URL("../features/tasks/constants/task-options.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  },
).outputText;
const { getNextTaskBoardStatus } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

test("board forward action completes a review while returned work resumes instead of completing", () => {
  assert.equal(getNextTaskBoardStatus("in_progress")?.value, "resolved");
  assert.equal(getNextTaskBoardStatus("resolved")?.value, "in_review");
  assert.equal(getNextTaskBoardStatus("in_review")?.value, "done");
  assert.equal(getNextTaskBoardStatus("returned")?.value, "in_progress");
  assert.equal(getNextTaskBoardStatus("unknown"), undefined);
  assert.equal(getNextTaskBoardStatus(undefined), undefined);
});

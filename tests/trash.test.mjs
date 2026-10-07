import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = ts.transpileModule(
  fs.readFileSync(
    new URL("../features/trash/lib/trash.ts", import.meta.url),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const loaded = { exports: {} };
new Function("module", "exports", source)(loaded, loaded.exports);
const { restoredHref } = loaded.exports;

test("復元した要件は元の要件定義書を経由し、親がない場合はURLを作らない", () => {
  assert.equal(
    restoredHref(4, { kind: "requirement", id: "5", container_id: 2 }),
    "/projects/joined/4/requirements/2/items/5",
  );
  assert.equal(
    restoredHref(4, { kind: "requirement", id: "5", container_id: null }),
    null,
  );
});

test("文書添付の復元リンクは親の文書を開く", () => {
  assert.equal(
    restoredHref(4, {
      kind: "document_attachment",
      id: "706fa60b-e2eb-4bff-b960-75020535f2ba",
      container_id: 3,
    }),
    "/projects/joined/4/documents/3",
  );
  assert.equal(
    restoredHref(4, {
      kind: "document_attachment",
      id: "706fa60b-e2eb-4bff-b960-75020535f2ba",
      container_id: null,
    }),
    null,
  );
});

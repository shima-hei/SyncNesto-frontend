import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = ts.transpileModule(
  fs.readFileSync(
    new URL("../features/documents/lib/document.ts", import.meta.url),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const loaded = { exports: {} };
new Function("module", "exports", source)(loaded, loaded.exports);
const { mergeDocumentValues, documentTargetHref } = loaded.exports;

test("文書の競合では未編集の項目に他の人の更新を保持する", () => {
  const original = { title: "旧タイトル", body: "旧本文" };
  const local = { title: "旧タイトル", body: "自分の本文" };
  const current = { title: "他の人のタイトル", body: "旧本文" };
  assert.deepEqual(mergeDocumentValues(original, local, current), {
    title: "他の人のタイトル",
    body: "自分の本文",
  });
  assert.equal(original.title, "旧タイトル");
});

test("両者が同じ項目を変えた場合はダイアログ用に自分の入力を保持する", () => {
  assert.deepEqual(
    mergeDocumentValues(
      { title: "旧タイトル", body: "本文" },
      { title: "自分のタイトル", body: "" },
      { title: "他の人のタイトル", body: "他の人の本文" },
    ),
    { title: "自分のタイトル", body: "" },
  );
});

test("関連要件は所属する要件定義書を経由し、参照不可ではURLを作らない", () => {
  assert.equal(
    documentTargetHref(4, {
      target_type: "requirement",
      target_id: 9,
      requirement_document_id: 2,
    }),
    "/projects/joined/4/requirements/2/items/9",
  );
  assert.equal(
    documentTargetHref(4, {
      target_type: "requirement",
      target_id: 9,
      requirement_document_id: null,
    }),
    null,
  );
});

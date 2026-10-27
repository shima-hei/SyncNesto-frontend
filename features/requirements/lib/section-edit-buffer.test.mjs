import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const code = ts.transpileModule(
  readFileSync(new URL("./section-edit-buffer.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const { createSectionEditBuffer } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
const section = (id, content = "保存済み") => ({
  id,
  document_id: 9,
  title: `章${id}`,
  content,
  version: 4,
});
test("章/タブ/SPAの再表示で同じ編集を保持し、ユーザー・組織・文書のscopeを分離", () => {
  const b = createSectionEditBuffer();
  const scope = "3:normal:1:21:9",
    other = "4:normal:1:21:9";
  const source = section(1);
  b.begin(scope, source);
  b.change(scope, 1, "未保存の章1");
  b.begin(scope, section(2));
  b.change(scope, 2, "未保存の章2");
  b.begin(scope, { ...source, content: "別の保存内容", version: 5 });
  assert.equal(b.get(scope)[1].content, "未保存の章1");
  assert.equal(b.get(scope)[1].section.version, 4);
  assert.equal(b.get(scope)[2].content, "未保存の章2");
  assert.equal(source.content, "保存済み");
  for (const key of [
    other,
    "3:normal:2:21:9",
    "3:normal:1:21:10",
    "3:demo:1:21:9",
  ])
    assert.deepEqual(b.get(key), {});
});
test("競合/失敗で本文と開始版を保持し、重複保存・古い応答による別編集の破棄を防ぐ", () => {
  const b = createSectionEditBuffer(),
    s = "scope";
  b.begin(s, section(1));
  b.change(s, 1, "手元の変更");
  b.begin(s, section(2));
  b.change(s, 2, "別の章");
  const first = b.startSave(s, 1);
  assert.equal(first.section.version, 4);
  assert.equal(b.startSave(s, 1), null);
  b.change(s, 1, "送信中の入力");
  assert.equal(b.get(s)[1].content, "手元の変更");
  b.failSave(
    s,
    1,
    first.request,
    Object.assign(new Error("VERSION_CONFLICT"), { status: 409 }),
  );
  assert.equal(b.get(s)[1].section.version, 4);
  assert.equal(b.get(s)[1].content, "手元の変更");
  const retry = b.startSave(s, 1);
  b.finishSave(s, 1, first.request);
  assert.equal(b.get(s)[1].request, retry.request);
  b.finishSave(s, 1, retry.request);
  assert.equal(b.get(s)[1], undefined);
  assert.equal(b.get(s)[2].content, "別の章");
});
test("未変更では終了を妨げず、未保存があれば警告し、破棄は指定の章だけ", () => {
  const b = createSectionEditBuffer(),
    s = "scope";
  let warnings = 0;
  const event = { preventDefault: () => warnings++ };
  b.begin(s, section(1, null));
  b.beforeUnload(event);
  assert.equal(warnings, 0);
  assert.equal(b.startSave(s, 1), null);
  b.change(s, 1, "入力");
  b.beforeUnload(event);
  assert.equal(warnings, 1);
  b.begin(s, section(2));
  b.change(s, 2, "別の入力");
  b.discard(s, 1);
  assert.equal(b.hasUnsaved(), true);
  assert.equal(b.get(s)[2].content, "別の入力");
  b.discard(s, 2);
  assert.equal(b.hasUnsaved(), false);
});

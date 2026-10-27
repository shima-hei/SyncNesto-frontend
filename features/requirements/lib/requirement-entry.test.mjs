import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const compile = (url) =>
  ts.transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
const asUrl = (code) =>
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const navigation = asUrl(
  compile(new URL("../../../lib/navigation/list-return.ts", import.meta.url)),
);
const source = compile(
  new URL("./requirement-entry.ts", import.meta.url),
).replace(
  JSON.stringify("@/lib/navigation/list-return"),
  JSON.stringify(navigation),
);
const { requirementEntryState, requirementListHref, isRequirementSmartEntry } =
  await import(asUrl(source));
const { standardChapterGuide } = await import(
  asUrl(
    compile(
      new URL("../constants/standard-chapter-guides.ts", import.meta.url),
    ),
  )
);
const ready = { fresh: true, fetching: false, placeholder: false, error: null };
test("未絞り込みの新しい結果だけで0・1・複数冊を判定", () => {
  assert.equal(
    requirementEntryState({ ...ready, data: { total: 0, items: [] } }).kind,
    "empty",
  );
  const one = { total: 1, items: [{ id: 9 }] };
  assert.deepEqual(requirementEntryState({ ...ready, data: one }), {
    kind: "single",
    documentId: 9,
  });
  assert.equal(
    requirementEntryState({
      ...ready,
      data: { total: 2, items: [{ id: 9 }, { id: 10 }] },
    }).kind,
    "multiple",
  );
  for (const context of [
    { fresh: false },
    { fetching: true },
    { placeholder: true },
  ])
    assert.equal(
      requirementEntryState({ ...ready, ...context, data: one }).kind,
      "loading",
    );
  assert.equal(
    requirementEntryState({ ...ready, error: Error("403"), data: one }).kind,
    "error",
  );
  assert.equal(
    requirementEntryState({ ...ready, data: { total: 1, items: [] } }).kind,
    "error",
  );
});
test("検索・ページ・戻り先・明示一覧の1件は総冊数1と扱わない", () => {
  assert.equal(isRequirementSmartEntry(new URLSearchParams()), true);
  for (const params of [
    "q=1件",
    "q=",
    "status=draft",
    "page=1",
    "view=list",
    "returnTo=",
    "unknown=context",
  ])
    assert.equal(isRequirementSmartEntry(new URLSearchParams(params)), false);
});
test("戻り先の条件を保持し、別Project・外部URL・1冊への往復ループを防止", () => {
  const url = new URL(
    requirementListHref(
      5,
      "/projects/joined/5/requirements?q=test&status=draft&page=2&returnTo=ignored",
    ),
    "https://syncnesto.invalid",
  );
  assert.equal(url.searchParams.get("view"), "list");
  assert.equal(url.searchParams.get("q"), "test");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.has("returnTo"), false);
  for (const candidate of [
    null,
    "/projects/joined/6/requirements",
    "https://example.com/projects/joined/5/requirements",
  ])
    assert.equal(
      requirementListHref(5, candidate),
      "/projects/joined/5/requirements?view=list",
    );
});
test("旧種別・未知種別は変更せず、ガイドは対応する章だけに表示", () => {
  for (const type of ["scope", "acceptance", "overview", "open_issue"])
    assert.ok(standardChapterGuide(type));
  for (const type of [
    "security",
    "custom-old-type",
    "constructor",
    "__proto__",
  ])
    assert.equal(standardChapterGuide(type), null);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = ts.transpileModule(
  fs.readFileSync(
    new URL("../features/search/lib/search.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const loaded = { exports: {} };
new Function("module", "exports", source)(loaded, loaded.exports);
const { readSearchState, searchHref, searchResultHref, matchingParts } =
  loaded.exports;

test("検索URLは語と条件を往復でき、ページ変更でも条件を失わない", () => {
  const state = readSearchState({
    q: "  認証%_\\ &?  ",
    category: "test",
    project_id: "7",
    page: "3",
  });
  const url = new URL(searchHref(state), "https://example.test");
  assert.deepEqual(
    readSearchState(Object.fromEntries(url.searchParams)),
    state,
  );
  assert.equal(state.q, "認証%_\\ &?");
  assert.equal(state.page, 3);
  assert.deepEqual(
    readSearchState({
      q: ["A", "B"],
      project_id: "1e3",
      page: "0",
      category: "users",
    }),
    { q: "", category: undefined, projectId: undefined, page: 1 },
  );
  assert.equal(readSearchState({ page: "501" }).page, 500);
});

test("要件・テスト項目・ケースは親の安定IDを含む詳細URLへ移動する", () => {
  const base = { project_id: 4, container_id: 8, id: "12" };
  assert.equal(
    searchResultHref({ ...base, kind: "requirement" }),
    "/projects/joined/4/requirements/8/items/12",
  );
  assert.equal(
    searchResultHref({ ...base, kind: "test_item", id: "uuid-123" }),
    "/projects/joined/4/test-designs/8?item=uuid-123",
  );
  assert.equal(
    searchResultHref({ ...base, kind: "test_case", id: "uuid-123" }),
    "/projects/joined/4/test-cases?design=8&case=uuid-123",
  );
});

test("一致表示は正規表現の特殊文字やHTMLを文字列のまま扱う", () => {
  for (const q of [".*", "[x]", "\\", "<script>"]) {
    const text = `前 ${q} 後`;
    const parts = matchingParts(text, q);
    assert.equal(parts.map((p) => p.text).join(""), text);
    assert.deepEqual(
      parts.filter((p) => p.match).map((p) => p.text),
      [q],
    );
  }
  assert.deepEqual(
    matchingParts("Login login", "LOGIN")
      .filter((p) => p.match)
      .map((p) => p.text),
    ["Login", "login"],
  );
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const navigation = readFileSync(
  new URL("./navigation.ts", import.meta.url),
  "utf8",
);
const verdict = readFileSync(
  new URL("./verdict.ts", import.meta.url),
  "utf8",
).replace(/^import .*from "\.\/navigation";\s*/m, "");
const code = ts.transpileModule(`${navigation}\n${verdict}`, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { verdictHref, verdictLabels } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);

test("判定から固定確認表の同じ行・要件の検索起点へ戻る情報を保つ", () => {
  const from =
    "/projects/joined/7?selectedRequirement=2&traceQ=入力&tracePage=3";
  const row = "75e358bb-fc04-400a-9b4b-2201b9b7748f";
  const url = new URL(
    verdictHref(7, "c39008c4-5293-4d44-8516-97197f298404", from, row),
    "https://syncnesto.invalid",
  );
  const origin = new URL(url.searchParams.get("from"), url);
  assert.equal(origin.pathname, "/projects/joined/7");
  assert.equal(origin.searchParams.get("traceQ"), "入力");
  assert.equal(origin.searchParams.get("tracePage"), "3");
  assert.equal(url.searchParams.get("row"), row);
  const unsafe = new URL(
    verdictHref(
      7,
      "c39008c4-5293-4d44-8516-97197f298404",
      "https://evil.example/",
      "javascript:alert(1)",
    ),
    url,
  );
  assert.equal(unsafe.searchParams.get("from"), "/projects/joined/7");
  assert.equal(unsafe.searchParams.has("row"), false);
});

test("過去合格・現在再判定・撤回・未集計を同じ表示へ畳まない", () => {
  const states = [
    "passed",
    "requires_reassessment",
    "withdrawn",
    "not_evaluated",
    "not_applicable",
  ];
  assert.equal(
    new Set(states.map((state) => verdictLabels[state])).size,
    states.length,
  );
});

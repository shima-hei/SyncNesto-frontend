import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const code = ts.transpileModule(
  readFileSync(new URL("./navigation.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const { safeVerificationOrigin, verificationHref, quoteOffset } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);

test("確認表から同じ案件の要件・検索・作業起点へ戻る", () => {
  for (const from of [
    "/projects/joined/7?selectedRequirement=2&traceQ=入力&tracePage=3",
    "/projects/joined/7/requirements/1/items/2?originProject=7&originTask=4&originList=%2Fprojects%2Fjoined%2F7%2Ftasks&tab=details",
  ]) {
    const result = new URL(
      verificationHref(7, "c39008c4-5293-4d44-8516-97197f298404", from),
      "https://syncnesto.invalid",
    );
    assert.equal(
      result.searchParams.get("from"),
      safeVerificationOrigin(from, 7),
    );
    assert.ok(
      result.searchParams
        .get("from")
        .includes(from.includes("originTask") ? "originTask=4" : "tracePage=3"),
    );
  }
});
test("戻り先の外部URL・別案件・不正文字・過長を拒否", () => {
  for (const value of [
    "//evil.test/projects/joined/7",
    "https://evil.test/projects/joined/7",
    "/projects/joined/8",
    "/projects/joined/7/requirement-verifications/x",
    "/projects/joined/7\\evil",
    "x".repeat(4097),
  ])
    assert.equal(safeVerificationOrigin(value, 7), "/projects/joined/7");
});
test("引用位置は絵文字・結合文字を含めUnicode code pointで返す", () => {
  assert.equal(quoteOffset("😀e\u0301入力を残す", "入力"), 3);
  assert.equal(quoteOffset("保存して戻る", "違う"), null);
  assert.equal(quoteOffset("保存", ""), null);
});

test("確認表のパンくずにUUIDと存在しない一覧リンクを出さない", async () => {
  const source = ts.transpileModule(
    readFileSync(
      new URL("../../app-shell/utils/breadcrumbs.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const { getBreadcrumbItems } = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  );
  const items = getBreadcrumbItems(
    "/projects/joined/7/requirement-verifications/c39008c4-5293-4d44-8516-97197f298404",
  );
  assert.equal(items.at(-1).label, "要件の確認表");
  assert.ok(
    !items.some(
      (item) =>
        item.label.includes("c39008c4") ||
        item.href?.endsWith("requirement-verifications"),
    ),
  );
});

test("下書きの復元先は同じ本人・案件・確認表の元版を保つ", async () => {
  const source = ts.transpileModule(
    readFileSync(new URL("./draft-version.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const { readDraftVersion, verificationDraftScope } = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  );
  assert.equal(readDraftVersion("2", 3), 2);
  for (const value of ["0", "-1", "NaN", "999999999999999999999", "3", "4"])
    assert.equal(readDraftVersion(value, 3), null);
  assert.notEqual(
    verificationDraftScope(1, "plan", 2),
    verificationDraftScope(2, "plan", 2),
  );
  assert.notEqual(
    verificationDraftScope(1, "plan", 2),
    verificationDraftScope(1, "plan", 3),
  );
});

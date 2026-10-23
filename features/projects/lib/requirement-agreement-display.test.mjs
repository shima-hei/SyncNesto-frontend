import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

async function load(source) {
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
  );
}
const { agreementDisplay } = await load(
  readFileSync(
    new URL("./requirement-agreement-display.ts", import.meta.url),
    "utf8",
  ),
);
const data = {
  enabled: true,
  state: "ready",
  evaluated_at: "2026-10-23T00:00:00Z",
  items: [
    {
      requirement_id: 7,
      version: 3,
      internal: { state: "agreed", reason: "current_subject" },
      external: { state: "unagreed", reason: "no_record" },
    },
  ],
};
const query = { isPending: false, isFetching: false, isError: false, data };

test("失敗した再取得では古い合意済み表示を残さない", () => {
  assert.equal(
    agreementDisplay({ ...query, isError: true }, 7, 3).kind,
    "error",
  );
  assert.equal(
    agreementDisplay({ ...query, isFetching: true }, 7, 3).kind,
    "loading",
  );
});
test("対象版の不一致と対象欠落を合意なしに補完しない", () => {
  assert.equal(agreementDisplay(query, 7, 4).kind, "stale");
  assert.equal(agreementDisplay(query, 8, 3).kind, "unavailable");
  assert.equal(agreementDisplay(query, 7, 3).row.external.state, "unagreed");
});
test("閲覧制限・未集計は過去の取得内容より優先する", () => {
  assert.equal(
    agreementDisplay({ ...query, data: { ...data, state: "restricted" } }, 7, 3)
      .kind,
    "restricted",
  );
  assert.equal(
    agreementDisplay({ ...query, data: { ...data, state: "disabled" } }, 7, 3)
      .kind,
    "disabled",
  );
});
test("生成クライアントは100件を繰り返しqueryで渡す", async () => {
  const source = readFileSync(
    new URL(
      "../../../lib/api/generated/requirement-agreements/requirement-agreements.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const ast = ts.createSourceFile(
    "client.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const name =
    "getReadRequirementAgreementsProjectsProjectIdRequirementAgreementsGetUrl";
  const statement = ast.statements.find(
    (s) =>
      ts.isVariableStatement(s) &&
      s.declarationList.declarations.some((d) => d.name.getText(ast) === name),
  );
  assert.ok(statement);
  const functions = await load(statement.getText(ast));
  const ids = Array.from({ length: 100 }, (_, i) => i + 1);
  const url = new URL(
    functions[name](5, { requirement_ids: ids }),
    "https://syncnesto.invalid",
  );
  assert.deepEqual(url.searchParams.getAll("requirement_ids"), ids.map(String));
});

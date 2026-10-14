import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const { outputText } = ts.transpileModule(
  readFileSync(new URL("./merge.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  },
);
const { mergeSpecifications } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const base = () => ({
  title: "ログイン",
  summary: "認証する",
  content: {
    type: "screen",
    route: "/login",
    fields: [
      { id: "email-id", name: "email", description: "メール", required: true },
      {
        id: "password-id",
        name: "password",
        description: "パスワード",
        required: true,
      },
    ],
    actions: [],
    states: [],
  },
});
test("別々の編集と並べ替えを両方保持", () => {
  const a = base(),
    b = base(),
    c = base();
  b.content.fields.reverse();
  b.content.fields[1].description = "メールアドレス";
  c.content.fields[1].description = "8文字以上";
  const result = mergeSpecifications(a, b, c);
  assert.equal(Object.keys(result.conflicts).length, 0);
  assert.deepEqual(
    result.values.content.fields.map((r) => [r.id, r.description]),
    [
      ["password-id", "8文字以上"],
      ["email-id", "メールアドレス"],
    ],
  );
});
test("同一項目だけを比較し相手の別の変更を保持", () => {
  const a = base(),
    b = base(),
    c = base();
  b.content.fields[0].description = "自分";
  c.content.fields[0].description = "相手";
  c.summary = "背景補足";
  const path = "content/fields/email-id/description";
  assert.deepEqual(Object.keys(mergeSpecifications(a, b, c).conflicts), [path]);
  const result = mergeSpecifications(a, b, c, { [path]: "current" });
  assert.equal(result.values.content.fields[0].description, "相手");
  assert.equal(result.values.summary, "背景補足");
});
test("削除と編集の競合は行を復元するか選択", () => {
  const a = base(),
    b = base(),
    c = base();
  b.content.fields.shift();
  c.content.fields[0].description = "修正済み";
  const path = "content/fields/email-id";
  assert.ok(mergeSpecifications(a, b, c).conflicts[path]);
  assert.equal(
    mergeSpecifications(a, b, c, { [path]: "local" }).values.content.fields
      .length,
    1,
  );
  assert.equal(
    mergeSpecifications(a, b, c, {
      [path]: "current",
    }).values.content.fields.find((r) => r.id === "email-id").description,
    "修正済み",
  );
});
test("同時に追加した別々の行を保持", () => {
  const a = base(),
    b = base(),
    c = base();
  b.content.fields.push({ id: "local-new", name: "token" });
  c.content.fields.push({ id: "remote-new", name: "expires" });
  assert.deepEqual(
    new Set(
      mergeSpecifications(a, b, c).values.content.fields.map((r) => r.id),
    ),
    new Set(["email-id", "password-id", "local-new", "remote-new"]),
  );
});

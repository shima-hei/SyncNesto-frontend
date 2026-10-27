import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const code = ts.transpileModule(
  readFileSync(new URL("./workbench-state.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
).outputText;
const { createWorkbenchState } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);

test("詳細往復で入力を保持し、文書/REQ/用途を混同しない", () => {
  const state = createWorkbenchState();
  state.activate("user:normal:tenant");
  const value = { body: "未送信", mentions: [{ user_id: 2 }] };
  state.write(
    "user:normal:tenant",
    "document:1",
    "requirement:1/comment",
    value,
  );
  assert.equal(
    state.read("user:normal:tenant", "document:1", "requirement:1/comment"),
    value,
  );
  for (const [doc, key] of [
    ["document:2", "requirement:1/comment"],
    ["document:1", "requirement:2/comment"],
    ["document:1", "requirement:1/approval"],
  ]) {
    assert.equal(state.read("user:normal:tenant", doc, key), undefined);
  }
  state.remove("user:normal:tenant", "document:1", "requirement:1/comment");
  assert.equal(
    state.read("user:normal:tenant", "document:1", "requirement:1/comment"),
    undefined,
  );
});

test("本人/デモ/組織変更後に古い入力や遅延した応答を持ち込まない", () => {
  const state = createWorkbenchState();
  state.activate("user:normal:tenant1");
  state.write("user:normal:tenant1", "doc", "key", "旧入力");
  for (const identity of [
    "user:normal:tenant2",
    "other:normal:tenant1",
    "user:demo:tenant1",
  ]) {
    state.activate(identity);
    state.write("user:normal:tenant1", "doc", "key", "遅延した更新");
    assert.equal(state.read(identity, "doc", "key"), undefined);
  }
  state.activate("user:normal:tenant1");
  assert.equal(state.read("user:normal:tenant1", "doc", "key"), undefined);
});

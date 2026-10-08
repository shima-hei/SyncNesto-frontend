import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const { outputText } = ts.transpileModule(
  readFileSync(new URL("./navigation.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
);
const { mcpReturnPath, mcpCallbackUrl } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("ログイン後の戻り先は検証済みの同意画面だけを許可", () => {
  const path = "/mcp/authorize?request_id=01234567-89ab-cdef-0123-456789abcdef";
  assert.equal(mcpReturnPath(path), path);
  for (const invalid of [
    "//evil.test",
    "https://evil.test",
    path + "&next=//evil.test",
    "/mcp/authorize?request_id=bad",
    [path],
  ])
    assert.equal(mcpReturnPath(invalid), undefined);
});
test("OAuth callbackはloopbackの指定パスだけを許可", () => {
  const callback = "http://127.0.0.1:54321/callback?code=example&state=state";
  assert.equal(mcpCallbackUrl(callback), callback);
  for (const invalid of [
    "https://evil.test/callback",
    "http://localhost:54321/callback",
    "http://127.0.0.1:54321/evil",
    "http://user:password@127.0.0.1:54321/callback",
    callback + "#fragment",
  ])
    assert.throws(() => mcpCallbackUrl(invalid));
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const { outputText } = ts.transpileModule(
  readFileSync(new URL("./navigation.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
);
const { mcpReturnPath, mcpCallbackUrl, mcpPluginInstallUrl } = await import(
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
  assert.equal(mcpCallbackUrl(callback, callback.split("?")[0]), callback);
  for (const invalid of [
    "https://evil.test/callback",
    "http://localhost:54321/callback",
    "http://127.0.0.1:54321/evil",
    "http://user:password@127.0.0.1:54321/callback",
    callback + "#fragment",
  ])
    assert.throws(() => mcpCallbackUrl(invalid, callback.split("?")[0]));
});

test("hosted callbackは同意した正確なURLにだけ戻す", () => {
  for (const expected of [
    "https://chatgpt.com/connector_platform_oauth_redirect",
    "https://chatgpt.com/connector/oauth/approved-id",
  ]) {
    const value =
      expected + "?code=example&state=state&iss=https%3A%2F%2Fapi.example%2F";
    assert.equal(mcpCallbackUrl(value, expected), value);
    for (const invalid of [
      value.replace("chatgpt.com", "chatgpt.com.evil.test"),
      value.replace("chatgpt.com", "evil@chatgpt.com"),
      value + "#fragment",
      value.replace("https:", "http:"),
      value.replace("?", "/other?"),
      value.replace("chatgpt.com/", "chatgpt.com/other/../"),
      value.replace("chatgpt.com", "chatgpt.com\\@evil.test"),
      value + "\n",
    ])
      assert.throws(() => mcpCallbackUrl(invalid, expected));
  }
  assert.throws(() =>
    mcpCallbackUrl(
      "http://127.0.0.1:54322/callback?code=x",
      "http://127.0.0.1:54321/callback",
    ),
  );
  assert.throws(() =>
    mcpCallbackUrl(
      "https://chatgpt.com/other?code=x",
      "https://chatgpt.com/other",
    ),
  );
});

test("プラグイン紹介URLが未設定・不正な場合は連携開始を公開しない", () => {
  const listing = "https://chatgpt.com/plugins/syncnesto";
  assert.equal(mcpPluginInstallUrl(listing), listing);
  for (const invalid of [
    undefined,
    "",
    "https://chatgpt.com/",
    "http://chatgpt.com/plugins/id",
    "https://chatgpt.com.evil.test/plugins/id",
    "https://user@chatgpt.com/plugins/id",
    listing + "?token=secret",
    listing + "#fragment",
    listing + "\n",
  ])
    assert.equal(mcpPluginInstallUrl(invalid), undefined);
});

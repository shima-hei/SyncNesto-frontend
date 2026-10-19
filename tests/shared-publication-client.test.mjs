import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

function load(path, dependencies = {}) {
  const loaded = { exports: {} };
  const source = ts.transpileModule(
    fs.readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    },
  ).outputText;
  new Function("require", "module", "exports", source)(
    (name) => dependencies[name] ?? {},
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

test("共有と従来MCPだけをログイン後の戻り先に許可する", () => {
  const navigation = load("../features/mcp/lib/navigation.ts");
  const { loginReturnPath } = load("../lib/auth/return-path.ts", {
    "@/features/mcp/lib/navigation": navigation,
  });
  for (const valid of [
    "/shared/publications",
    "/shared/publications/11111111-1111-1111-1111-111111111111",
    "/mcp/authorize?request_id=11111111-1111-1111-1111-111111111111",
  ])
    assert.equal(loginReturnPath(valid), valid);
  for (const invalid of [
    "https://example.com",
    "//example.com",
    "/shared/publications?next=//example.com",
    "/shared/publications/../users",
    "/shared/publications\\evil",
    "/projects/21",
    ["/shared/publications"],
    null,
  ])
    assert.equal(loginReturnPath(invalid), undefined);
});

test("sharedの取得だけは選択Tenantを付けず、明示headerも除き、保存しない", async () => {
  const client = load("../lib/api/client.ts", {
    "./tenant-context": { getApiTenant: () => 17 },
    "@/lib/demo/session": { getClientDataRealm: () => "normal" },
  });
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (_url, options) => {
    calls.push(options);
    return Response.json({});
  };
  const abort = new AbortController();
  try {
    await client.apiClient("/shared/publications", { signal: abort.signal });
    await client.apiClient(
      "/shared/publications/00000000-0000-0000-0000-000000000001",
      { headers: { "X-Tenant-ID": "999" } },
    );
    await client.apiClient("/projects/21", {});
    assert.equal(calls[0].headers.has("X-Tenant-ID"), false);
    assert.equal(calls[1].headers.has("X-Tenant-ID"), false);
    assert.equal(calls[0].cache, "no-store");
    assert.equal(calls[1].cache, "no-store");
    assert.equal(calls[0].signal, abort.signal);
    assert.equal(calls[2].headers.get("X-Tenant-ID"), "17");
    assert.equal(calls[2].cache, undefined);
  } finally {
    globalThis.fetch = previous;
  }
});

test("本人変更の別tab通知には本文・token・本人情報を保存しない", () => {
  const events = load("../lib/auth/shared-access-events.ts");
  const previousWindow = globalThis.window;
  const previousChannel = globalThis.BroadcastChannel;
  const writes = [],
    messages = [];
  globalThis.window = {
    dispatchEvent: () => {},
    localStorage: { setItem: (key, value) => writes.push([key, value]) },
  };
  globalThis.BroadcastChannel = class {
    postMessage(value) {
      messages.push(value);
    }
    close() {}
  };
  try {
    events.announceSharedAuthChange();
    assert.deepEqual(messages, ["changed"]);
    assert.equal(writes.length, 1);
    assert.equal(writes[0][0], events.SHARED_AUTH_STORAGE_KEY);
    assert.match(writes[0][1], /^[a-f0-9-]{36}$/);
  } finally {
    globalThis.window = previousWindow;
    globalThis.BroadcastChannel = previousChannel;
  }
});

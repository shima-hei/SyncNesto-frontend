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

test("共有・本人招待・従来MCPだけをログイン後の戻り先に許可する", () => {
  const navigation = load("../features/mcp/lib/navigation.ts");
  const { loginReturnPath } = load("../lib/auth/return-path.ts", {
    "@/features/mcp/lib/navigation": navigation,
  });
  for (const valid of [
    "/shared/publications",
    "/shared/notifications",
    "/guest-invitations/11111111-1111-1111-1111-111111111111",
    "/shared/publications/11111111-1111-1111-1111-111111111111",
    "/shared/publications/11111111-1111-1111-1111-111111111111/approval-requests/22222222-2222-2222-2222-222222222222",
    "/mcp/authorize?request_id=11111111-1111-1111-1111-111111111111",
  ])
    assert.equal(loginReturnPath(valid), valid);
  for (const invalid of [
    "https://example.com",
    "/shared/notifications?next=//evil.test",
    "/shared/notifications/../users",
    "//example.com",
    "/shared/publications?next=//example.com",
    "/shared/publications/../users",
    "/shared/publications\\evil",
    "/shared/publications/11111111-1111-1111-1111-111111111111/approval-requests/../../users",
    "/shared/publications/11111111-1111-1111-1111-111111111111/approval-requests/22222222-2222-2222-2222-222222222222?next=//evil.test",
    "/shared/publications/11111111-1111-1111-1111-111111111111/approval-requests/22222222-2222-2222-2222-222222222222#secret",
    "/projects/21",
    "/guest-invitations/11111111-1111-1111-1111-111111111111#token=secret",
    "/guest-invitations/11111111-1111-1111-1111-111111111111?next=//evil.test",
    "/guest-invitations/../users",
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
    await client.apiClient("/notification-preferences", {
      headers: { "X-Tenant-ID": "999", "X-Syncnesto-Expected-User": "7" },
    });
    assert.equal(calls[0].headers.has("X-Tenant-ID"), false);
    assert.equal(calls[1].headers.has("X-Tenant-ID"), false);
    assert.equal(calls[0].cache, "no-store");
    assert.equal(calls[1].cache, "no-store");
    assert.equal(calls[0].signal, abort.signal);
    assert.equal(calls[2].headers.get("X-Tenant-ID"), "17");
    assert.equal(calls[2].cache, undefined);
    assert.equal(calls[3].headers.has("X-Tenant-ID"), false);
    assert.equal(calls[3].headers.get("X-Syncnesto-Expected-User"), "7");
    assert.equal(calls[3].cache, "no-store");
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

test("外部判断のMFA不足は画面内で扱い、既存APIの再ログインは維持する", async () => {
  const { apiClient } = load("../lib/api/client.ts", {
    "./tenant-context": { getApiTenant: () => null },
    "@/lib/demo/session": { getClientDataRealm: () => "normal" },
    "@/lib/auth/session-events": { isAuthSessionInvalidCode: () => false },
    "./error": { ApiError: class extends Error {} },
  });
  const previousFetch = globalThis.fetch;
  const previousWindow = globalThis.window;
  const redirects = [];
  globalThis.window = {
    location: {
      pathname: "/shared/publications",
      replace: (url) => redirects.push(url),
    },
  };
  globalThis.fetch = async () =>
    Response.json(
      { code: "MFA_REQUIRED", message: "追加認証が必要です" },
      { status: 403 },
    );
  const detail =
    "/shared/publications/11111111-1111-1111-1111-111111111111/approval-requests/22222222-2222-2222-2222-222222222222";
  try {
    for (const path of [
      "/shared/publications/approval-requests",
      "/shared/notifications",
      "/shared/notifications?unread_only=true&page=2",
      "/shared/notifications/unread-count",
      "/shared/notifications/read-all",
      "/shared/notifications/11111111-1111-1111-1111-111111111111/read",
      "/shared/publications/approval-requests?status=requested&page_size=20",
      detail,
      detail + "/bases",
      detail + "/bases?cursor=opaque&page_size=100",
      detail + "/decision-preview",
      detail + "/decisions",
    ])
      await assert.rejects(apiClient(path, {}));
    assert.deepEqual(redirects, []);
    await assert.rejects(apiClient("/projects/21", {}));
    assert.deepEqual(redirects, ["/login?reason=mfa-required"]);
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.window = previousWindow;
  }
});

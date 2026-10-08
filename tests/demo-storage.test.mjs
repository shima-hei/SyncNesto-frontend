import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

function load(path, dependencies = {}) {
  const result = { exports: {} };
  const source = ts.transpileModule(
    fs.readFileSync(new URL(path, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  new Function("require", "module", "exports", source)(
    (name) => dependencies[name] ?? {},
    result,
    result.exports,
  );
  return result.exports;
}

const demo = load("../lib/demo/session.ts");
const form = load("../lib/draft/draft-storage.ts", {
  "@/lib/demo/session": demo,
  "./draft-key": {
    createDraftStorageKey: (id, scope) => `syncnesto:draft:user:${id}:${scope}`,
  },
});
const design = load("../features/test-designs/lib/draft.ts", {
  "@/lib/demo/session": demo,
});
const client = load("../lib/api/client.ts", {
  "@/lib/demo/session": demo,
  "./tenant-context": { getApiTenant: () => null },
});

test("更新には画面のrealmを添え、本人状態のGETでCookieの切り替えを再確認する", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (_url, options) => {
    calls.push(options.headers.get("X-Syncnesto-Data-Realm"));
    return options.method === "GET"
      ? Response.json({ id: 1, demo: null })
      : new Response(null, { status: 204 });
  };
  try {
    demo.registerDemoUser({
      id: 1,
      demo: {
        id: "before",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    await client.apiClient("/auth/me", { method: "PATCH", body: "{}" });
    await client.apiClient("/auth/me", { method: "GET" });
    await client.apiClient("/auth/me", { method: "PATCH", body: "{}" });
    assert.deepEqual(calls, ["demo", null, "normal"]);
  } finally {
    globalThis.fetch = originalFetch;
    demo.clearDemoData(false);
  }
});

test("デモ下書きは永続領域へ書かず、終了後の遅い書込も復活させない", async () => {
  const stored = new Map();
  const calls = [];
  global.window = {
    localStorage: {
      getItem: (key) => stored.get(key) ?? null,
      setItem: (key, value) => {
        calls.push(key);
        stored.set(key, value);
      },
      removeItem: (key) => stored.delete(key),
    },
  };
  global.indexedDB = {
    open: () => {
      throw new Error("Demo must not open IndexedDB");
    },
  };
  try {
    demo.registerDemoUser({
      id: 42,
      demo: {
        id: "a",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    form.writeStoredDraft(42, "task", { title: "一時入力" });
    assert.equal(form.readStoredDraft(42, "task").values.title, "一時入力");
    await design.writeDraft("demo:a:42:design", {
      design: { name: "一時設計" },
    });
    assert.equal(
      (await design.readDraft("demo:a:42:design")).design.name,
      "一時設計",
    );
    assert.deepEqual(calls, []);
    demo.clearDemoData(false);
    form.writeStoredDraft(42, "task", { title: "終了後に遅れて保存" });
    await design.writeDraft("demo:a:42:design", {
      design: { name: "遅れて保存" },
    });
    assert.equal(form.readStoredDraft(42, "task"), null);
    assert.equal(await design.readDraft("demo:a:42:design"), undefined);
    assert.deepEqual(calls, []);
    demo.registerDemoUser({ id: 100, demo: null });
    form.writeStoredDraft(100, "task", { title: "通常ユーザー" });
    assert.equal(
      form.readStoredDraft(100, "task").values.title,
      "通常ユーザー",
    );
    assert.equal(calls.length, 1);
  } finally {
    delete global.window;
    delete global.indexedDB;
    demo.clearDemoData(false);
  }
});

test("デモをリセットすると旧デモのメモリ下書きを復元しない", () => {
  demo.registerDemoUser({
    id: 43,
    demo: {
      id: "old",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    },
  });
  demo.writeDemoDraft("field", { text: "old" });
  demo.registerDemoUser({
    id: 44,
    demo: {
      id: "new",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    },
  });
  assert.equal(demo.readDemoDraft("field"), null);
  demo.clearDemoData(false);
});

test("statusで別デモへ切り替わった時点で旧フォームの保存を無効にする", () => {
  demo.registerDemoUser({
    id: 1,
    demo: {
      id: "old",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    },
  });
  const previous = demo.getDraftSession(1);
  demo.registerDemoStatus({
    id: "new",
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  });
  assert.equal(demo.isCurrentDraftSession(1, previous), false);
  assert.equal(demo.getDraftSession(1), null);
  demo.clearDemoData(false);
});

test("別DBで同じユーザーIDでも通常下書きを保持し、旧デモの遅い書込を拒否する", () => {
  const stored = new Map();
  global.window = {
    localStorage: {
      getItem: (key) => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, value),
      removeItem: (key) => stored.delete(key),
    },
  };
  try {
    demo.registerDemoUser({ id: 1, demo: null });
    form.writeStoredDraft(1, "task", { title: "通常の下書き" });
    demo.registerDemoUser({
      id: 1,
      demo: {
        id: "isolated",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    const demoSession = demo.getDraftSession(1);
    assert.equal(form.readStoredDraft(1, "task"), null);
    form.writeStoredDraft(1, "task", { title: "デモの下書き" }, 1, demoSession);
    demo.clearDemoData(false);
    demo.registerDemoUser({ id: 1, demo: null });
    assert.equal(form.readStoredDraft(1, "task").values.title, "通常の下書き");
    form.writeStoredDraft(1, "task", { title: "遅れて書込" }, 1, demoSession);
    form.removeStoredDraft(1, "task", demoSession);
    assert.equal(form.readStoredDraft(1, "task").values.title, "通常の下書き");
    assert.equal(stored.size, 1);
  } finally {
    delete global.window;
    demo.clearDemoData(false);
  }
});

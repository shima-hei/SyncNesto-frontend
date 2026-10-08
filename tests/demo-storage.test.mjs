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

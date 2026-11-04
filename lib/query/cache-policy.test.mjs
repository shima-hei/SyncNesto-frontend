import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(path, dependencies = {}) {
  const loaded = { exports: {} };
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function("require", "module", "exports", source)(
    (name) => dependencies[name] ?? require(name),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}
const policy = load(new URL("./cache-policy.ts", import.meta.url));
const settled = () => new Promise((resolve) => setImmediate(resolve));

test("参照候補を繰り返し表示しても60秒以内は共有し、変更後と別案件は再取得する", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  let count = 0;
  const queryFn = async () => {
    count += 1;
    return { items: [{ id: count }] };
  };
  const key = ["/projects/5/member-users", { limit: 20 }];
  const mount = async (queryKey, staleTime) => {
    const observer = new QueryObserver(client, {
      queryKey,
      queryFn,
      staleTime,
    });
    const unsubscribe = observer.subscribe(() => {});
    await settled();
    unsubscribe();
  };
  try {
    for (let i = 0; i < 6; i++) await mount(key, 0);
    assert.equal(count, 6);
    client.clear();
    count = 0;
    for (let i = 0; i < 6; i++) await mount(key, policy.REFERENCE_STALE_TIME);
    assert.equal(count, 1);
    await client.invalidateQueries({ queryKey: [key[0]], refetchType: "none" });
    await mount(key, policy.REFERENCE_STALE_TIME);
    assert.equal(count, 2);
    await mount(
      ["/projects/6/member-users", { limit: 20 }],
      policy.REFERENCE_STALE_TIME,
    );
    assert.equal(count, 3);
    assert.ok(policy.isProjectUserChoiceQuery(key));
    assert.ok(
      policy.isProjectUserChoiceQuery(["/projects/5/member-candidates"]),
    );
    assert.equal(policy.isProjectUserChoiceQuery(["/projects/5/me"]), false);
  } finally {
    client.clear();
  }
});

test("通知は取得直後の遷移をまとめ、15秒経過・明示失効・失敗時は再取得する", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const key = ["notifications", 1, "unread-count", undefined];
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  let calls = 0;
  let fail = false;
  const observer = new QueryObserver(client, {
    queryKey: key,
    queryFn: async () => {
      calls += 1;
      if (fail) throw new Error("temporary");
      return { count: 2 };
    },
    staleTime: policy.NOTIFICATION_STALE_TIME,
  });
  const unsubscribe = observer.subscribe(() => {});
  try {
    await settled();
    for (let i = 0; i < 5; i++)
      await client.refetchQueries({ queryKey: key, exact: true });
    assert.equal(calls, 6);
    calls = 0;
    for (let i = 0; i < 5; i++)
      await policy.refreshActiveQueryIfStale(
        client,
        key,
        policy.NOTIFICATION_STALE_TIME,
      );
    assert.equal(calls, 0);
    now += policy.NOTIFICATION_STALE_TIME;
    await policy.refreshActiveQueryIfStale(
      client,
      key,
      policy.NOTIFICATION_STALE_TIME,
    );
    assert.equal(calls, 1);
    await client.invalidateQueries({ queryKey: key, refetchType: "none" });
    fail = true;
    await policy.refreshActiveQueryIfStale(
      client,
      key,
      policy.NOTIFICATION_STALE_TIME,
    );
    assert.equal(client.getQueryState(key).status, "error");
    fail = false;
    await policy.refreshActiveQueryIfStale(
      client,
      key,
      policy.NOTIFICATION_STALE_TIME,
    );
    assert.equal(calls, 3);
    assert.equal(client.getQueryState(key).status, "success");
    const otherTenant = new QueryClient();
    assert.equal(otherTenant.getQueryData(key), undefined);
    otherTenant.clear();
  } finally {
    unsubscribe();
    client.clear();
  }
});

test("候補検索は連続5文字を1回にまとめ、入力終了と解除時に古いタイマーを破棄する", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let value = "";
  let effect;
  let cleanup;
  const hook = load(
    new URL("../../hooks/use-debounced-value.ts", import.meta.url),
    {
      react: {
        useState: () => [value, (next) => (value = next)],
        useEffect: (next) => (effect = next),
      },
    },
  );
  const originalWindow = globalThis.window;
  globalThis.window = globalThis;
  try {
    for (const input of ["a", "al", "ali", "alic", "alice"]) {
      cleanup?.();
      hook.useDebouncedValue(input, policy.SEARCH_DEBOUNCE_MS);
      cleanup = effect();
      t.mock.timers.tick(50);
      assert.equal(value, "");
    }
    t.mock.timers.tick(policy.SEARCH_DEBOUNCE_MS);
    assert.equal(value, "alice");
    cleanup();
    hook.useDebouncedValue("bob", policy.SEARCH_DEBOUNCE_MS);
    cleanup = effect();
    cleanup();
    t.mock.timers.tick(policy.SEARCH_DEBOUNCE_MS);
    assert.equal(value, "alice");
  } finally {
    globalThis.window = originalWindow;
  }
});

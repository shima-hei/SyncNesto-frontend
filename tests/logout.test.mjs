import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

function load(path, dependencies) {
  const source = ts.transpileModule(
    fs.readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", source)(
    (name) => dependencies[name] ?? {},
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function setup({ cancel = async () => {} } = {}) {
  const effects = [];
  const urls = [];
  const toasts = [];
  const calls = [];
  const request = deferred();
  let onInvalid;
  let onDemoEnded;
  let context;
  class ApiError extends Error {
    constructor(code) {
      super(code);
      this.code = code;
    }
  }
  const client = {
    clear: () => {
      calls.push("clear");
      onInvalid();
    },
  };
  const cache = {
    cancelCurrentUserQuery: cancel,
    setCurrentUserCache: (_client, user) => calls.push(["user", user]),
  };
  const provider = load("../features/auth/providers/auth-provider.tsx", {
    react: {
      createContext: () => ({ Provider: "provider" }),
      useContext: () => context,
      useCallback: (callback) => callback,
      useEffect: (effect) => effects.push(effect),
      useRef: (value) => ({ current: value }),
    },
    "react/jsx-runtime": { jsx: (_type, props) => props },
    "@tanstack/react-query": { useQueryClient: () => client },
    "next/navigation": { usePathname: () => "/account" },
    sonner: { toast: { error: (message) => toasts.push(message) } },
    "@/lib/api/error": { ApiError },
    "@/lib/auth/return-path": load("../lib/auth/return-path.ts", {
      "@/features/mcp/lib/navigation": load(
        "../features/mcp/lib/navigation.ts",
        {},
      ),
    }),
    "@/lib/demo/session": {
      clearDemoData: () => calls.push("demo-cleared"),
      subscribeDemoEnded: (callback) => {
        onDemoEnded = callback;
        return () => {};
      },
    },
    "@/lib/auth/session-events": {
      isAuthSessionInvalidCode: (code) => code === "TOKEN_EXPIRED",
      subscribeAuthSessionInvalid: (callback) => {
        onInvalid = callback;
        return () => {};
      },
    },
    "../hooks/use-current-user": {
      useCurrentUser: () => ({
        user: { id: 1 },
        refetchUser: async () => calls.push("refetch"),
      }),
    },
    "../lib/current-user-cache": cache,
    "../constants/current-user-messages": {
      CURRENT_USER_MESSAGES: { sessionExpired: "expired" },
    },
  });
  const previousWindow = global.window;
  global.window = {
    location: {
      pathname: "/account",
      search: "?tab=profile",
      hash: "#security",
      replace: (url) => urls.push(url),
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  context = provider.AuthProvider({ children: null }).value;
  const cleanups = effects.map((effect) => effect());
  const hook = load("../features/auth/hooks/use-logout.ts", {
    "@tanstack/react-query": { useQueryClient: () => client },
    "@/lib/api/generated/auth/auth": {
      useLogoutUserAuthLogoutPost: () => ({
        mutateAsync: () => request.promise,
      }),
    },
    "@/lib/demo/session": { clearDemoData: () => calls.push("demo-cleared") },
    "../lib/current-user-cache": cache,
    "../providers/auth-provider": provider,
  });
  return {
    logout: hook.useLogout().logout,
    request,
    expire: () => onInvalid(),
    demoEnded: () => onDemoEnded(),
    ApiError,
    urls,
    toasts,
    calls,
    cleanup: () => {
      cleanups.forEach((cleanup) => cleanup?.());
      if (previousWindow === undefined) delete global.window;
      else global.window = previousWindow;
    },
  };
}

test("手動ログアウト中の遅い認証エラーとキャッシュ破棄で期限切れを表示しない", async () => {
  const app = setup();
  try {
    const completion = app.logout();
    app.expire();
    app.request.resolve();
    await completion;
    assert.deepEqual(app.toasts, []);
    assert.deepEqual(app.urls, ["/login"]);
    assert.ok(app.calls.includes("demo-cleared"));
    assert.equal(app.calls.filter((call) => call === "clear").length, 2);
  } finally {
    app.cleanup();
  }
});

test("ログアウトに失敗した後も通常のセッション切れを通知する", async () => {
  const app = setup();
  try {
    const completion = app.logout();
    app.request.reject(new Error("network"));
    await assert.rejects(completion, /network/);
    assert.deepEqual(app.urls, []);
    assert.ok(!app.calls.includes("demo-cleared"));
    app.expire();
    await Promise.resolve();
    assert.deepEqual(app.toasts, ["expired"]);
    assert.deepEqual(app.urls, [
      "/login?reason=session-expired&next=%2Faccount%3Ftab%3Dprofile%23security",
    ]);
  } finally {
    app.cleanup();
  }
});

test("ログアウト要求自体が認証エラーなら失敗後に期限切れを通知する", async () => {
  const app = setup();
  try {
    const completion = app.logout();
    app.expire();
    app.request.reject(new app.ApiError("TOKEN_EXPIRED"));
    await assert.rejects(completion, /TOKEN_EXPIRED/);
    await Promise.resolve();
    assert.deepEqual(app.toasts, ["expired"]);
    assert.deepEqual(app.urls, [
      "/login?reason=session-expired&next=%2Faccount%3Ftab%3Dprofile%23security",
    ]);
  } finally {
    app.cleanup();
  }
});

test("認証エラーの処理待ち中にログアウトした場合も誤通知しない", async () => {
  const cancellation = deferred();
  const app = setup({ cancel: () => cancellation.promise });
  try {
    app.expire();
    const completion = app.logout();
    app.request.resolve();
    cancellation.resolve();
    await completion;
    assert.deepEqual(app.toasts, []);
    assert.deepEqual(app.urls, ["/login"]);
  } finally {
    app.cleanup();
  }
});

test("他タブでデモを終了した場合も期限切れと誤案内しない", async () => {
  const app = setup();
  try {
    app.demoEnded();
    await Promise.resolve();
    assert.deepEqual(app.toasts, []);
    assert.deepEqual(app.urls, ["/login"]);
  } finally {
    app.cleanup();
  }
});

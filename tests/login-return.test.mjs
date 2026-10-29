import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

function load(path, dependencies = {}) {
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

const paths = load("../lib/auth/return-path.ts", {
  "@/features/mcp/lib/navigation": load("../features/mcp/lib/navigation.ts"),
});
const target = "/projects/joined/5/tasks/67?tab=comments#comment-57";

test("通常業務画面のpath・query・fragmentを保持し、認証ループや外部遷移を拒否する", () => {
  for (const valid of [
    target,
    "/projects/joined/5?tab=tasks&q=%E6%8E%A5%E7%B6%9A",
    "/projects/management/5/members",
    "/system/users/7",
    "/organization/audit-logs?actor=7",
    "/account?tab=profile",
    "/notifications",
    "/search?q=%2F%2Fevil.test",
    "/entry",
    "/",
  ])
    assert.equal(paths.loginReturnPath(valid), valid);
  for (const invalid of [
    "https://evil.test/projects/joined/5",
    "//evil.test",
    "/\\evil.test",
    "/%2f%2fevil.test",
    "/projects/joined/%2e%2e/login",
    "/projects/joined/5/../../login",
    "/projects/joined/5\\evil",
    "/projects/joined/5\n",
    "/login?next=/projects/joined/5",
    "/mfa?next=/projects/joined/5",
    "/initial-password",
    "/api/auth/logout",
    "/_next/static/file.js",
    "/forgot-password",
    "/mcp/authorize?request_id=wrong",
    "/shared/publications?next=//evil.test",
    "/guest-invitations/11111111-1111-1111-1111-111111111111#token=secret",
  ])
    assert.equal(paths.loginReturnPath(invalid), undefined, invalid);
});

test("proxyは受信した戻り先headerを信用せず実リクエストのqueryまで設定する", () => {
  const { proxy } = load("../proxy.ts", {
    "@/lib/auth/return-path": paths,
    "next/server": {
      NextResponse: {
        next: (options) => ({
          request: options.request,
          headers: new Headers(),
        }),
      },
    },
  });
  const result = proxy({
    nextUrl: new URL(
      "https://syncnesto.example/projects/joined/5/tasks/67?tab=comments",
    ),
    headers: new Headers({
      [paths.LOGIN_RETURN_HEADER]: "//evil.test",
      "x-syncnesto-pathname": "/login",
    }),
  });
  assert.equal(
    result.request.headers.get(paths.LOGIN_RETURN_HEADER),
    "/projects/joined/5/tasks/67?tab=comments",
  );
  assert.equal(
    result.request.headers.get("x-syncnesto-pathname"),
    "/projects/joined/5/tasks/67",
  );
});

test("Server Guardは未認証・失効・MFA準備のいずれでも踏んだ業務リンクへ戻せる", async () => {
  const previousFetch = globalThis.fetch;
  const path = "/projects/joined/5/tasks/67?tab=comments";
  const expected = encodeURIComponent(path);
  try {
    for (const [cookieNames, responseCode, destination] of [
      [[], null, "/login"],
      [["csrf_token"], null, "/login?reason=session-expired"],
      [["mfa_flow", "csrf_token"], null, "/mfa"],
      [["access_token"], "TOKEN_EXPIRED", "/login?reason=session-expired"],
      [["access_token"], "MFA_REQUIRED", "/login?reason=mfa-required"],
    ]) {
      const server = load("../lib/auth/server.ts", {
        "@/lib/auth/return-path": paths,
        "next/headers": {
          cookies: async () => ({
            has: (name) => cookieNames.includes(name),
            toString: () => "access_token=dummy",
          }),
          headers: async () =>
            new Headers({ [paths.LOGIN_RETURN_HEADER]: path }),
        },
        "next/navigation": {
          redirect: (url) => {
            throw new Error(url);
          },
        },
        "@/lib/auth/session-events": {
          AUTH_ERROR_CODES: { tokenExpired: "TOKEN_EXPIRED" },
        },
        "@/lib/security/csrf": { CSRF_COOKIE_NAME: "csrf_token" },
        "@/lib/security/backend": {
          authenticateBackendRequest: (headers) => headers,
        },
      });
      globalThis.fetch = async () =>
        Response.json({ code: responseCode }, { status: 403 });
      await assert.rejects(server.requireUser(), {
        message: `${destination}${destination.includes("?") ? "&" : "?"}next=${expected}`,
      });
    }
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("ログイン→MFA完了は同じリンクへ戻り、直接ログインも初期パスワードもnextを保持する", async () => {
  const previousWindow = globalThis.window;
  const urls = [];
  globalThis.window = {
    location: { hash: "#comment-57", replace: (url) => urls.push(url) },
  };
  try {
    for (const [response, expected] of [
      [{ next_step: "mfa_verify" }, `/mfa?next=${encodeURIComponent(target)}`],
      [{ next_step: "authenticated", password_change_required: false }, target],
      [
        { password_change_required: true },
        `/initial-password?next=${encodeURIComponent(target)}`,
      ],
    ]) {
      const { useLogin: createLoginHarness } = load(
        "../features/auth/hooks/use-login.ts",
        {
          react: { useState: (value) => [value, () => {}] },
          "next/navigation": {
            useRouter: () => ({ replace: (url) => urls.push(url) }),
          },
          "@tanstack/react-query": {
            useQueryClient: () => ({ clear: () => {} }),
          },
          "@/lib/api/generated/auth/auth": {
            useLoginUserAuthLoginPost: () => ({
              mutateAsync: async () => response,
            }),
          },
          "@/lib/auth/return-path": paths,
          "@/lib/messages/api-error-message": {
            getLoginApiErrorMessage: () => null,
          },
          "../lib/current-user-cache": {
            invalidateCurrentUser: async () => {},
          },
        },
      );
      await createLoginHarness(target.split("#")[0]).login({});
      assert.equal(urls.at(-1), expected);
    }
    const { MfaPage } = load("../features/auth/components/mfa/mfa-page.tsx", {
      react: { useState: (value) => [value, () => {}] },
      "react/jsx-runtime": {
        jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props }),
      },
      "@tanstack/react-query": { useQueryClient: () => ({ clear: () => {} }) },
      "./mfa-challenge": { MfaChallenge: "mfa-challenge" },
    });
    const rendered = MfaPage({
      flow: { next_step: "mfa_verify" },
      returnTo: target,
    });
    rendered.props.children.props.children[0].props.onComplete();
    assert.equal(urls.at(-1), target);
    assert.equal(
      paths.loginReturnPathWithFragment(
        "/guest-invitations/11111111-1111-1111-1111-111111111111",
        "#token=secret",
      ),
      "/guest-invitations/11111111-1111-1111-1111-111111111111",
    );
  } finally {
    globalThis.window = previousWindow;
  }
});

test("期限切れtoastのreason除去でnextやfragmentを落とさない", () => {
  const previousWindow = globalThis.window;
  const urls = [];
  const effects = [];
  const loginUrl = `/login?reason=session-expired&next=${encodeURIComponent(target.split("#")[0])}#comment-57`;
  globalThis.window = {
    location: { href: `https://syncnesto.example${loginUrl}` },
  };
  try {
    const { LoginSessionToast } = load(
      "../features/auth/components/login/login-session-toast.tsx",
      {
        react: {
          useEffect: (effect) => effects.push(effect),
          useRef: (value) => ({ current: value }),
        },
        "next/navigation": {
          useRouter: () => ({ replace: (url) => urls.push(url) }),
        },
        sonner: { toast: { error: () => {} } },
        "../../constants/current-user-messages": {
          CURRENT_USER_MESSAGES: { sessionExpired: "expired" },
        },
      },
    );
    LoginSessionToast({ showSessionExpiredToast: true });
    effects.forEach((effect) => effect());
    const result = new URL(urls[0], "https://syncnesto.example");
    assert.equal(result.searchParams.has("reason"), false);
    assert.equal(result.searchParams.get("next"), target.split("#")[0]);
    assert.equal(result.hash, "#comment-57");
  } finally {
    globalThis.window = previousWindow;
  }
});

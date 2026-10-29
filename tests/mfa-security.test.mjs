import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

function load(path, dependencies = {}) {
  const source = ts.transpileModule(
    fs.readFileSync(new URL(path, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", source)(
    (name) => dependencies[name] ?? {},
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

const csrf = load("../lib/security/csrf.ts");

function request(cookies, header, method = "POST") {
  const values = new Map(Object.entries(cookies));
  return {
    method,
    cookies: {
      has: (key) => values.has(key),
      get: (key) => (values.has(key) ? { value: values.get(key) } : undefined),
    },
    headers: new Headers(header ? { "X-CSRF-Token": header } : {}),
  };
}

test("通常CookieがまだないMFA検証もCSRF一致を必須にする", () => {
  const cookies = { mfa_flow: "limited", csrf_token: "csrf" };
  for (const path of [
    "/auth/mfa/verify-code",
    "/auth/mfa/passkeys/verify",
    "/auth/mfa/finish",
    "/auth/mfa/cancel",
  ]) {
    assert.equal(csrf.validateCsrfToken(request(cookies), path), false);
    assert.equal(
      csrf.validateCsrfToken(request(cookies, "wrong"), path),
      false,
    );
    assert.equal(csrf.validateCsrfToken(request(cookies, "csrf"), path), true);
  }
  assert.equal(
    csrf.validateCsrfToken(
      request({ mfa_flow: "limited" }, "csrf"),
      "/auth/mfa/finish",
    ),
    false,
  );
  assert.equal(csrf.validateCsrfToken(request(cookies), "/auth/login"), true);
  assert.equal(
    csrf.validateCsrfToken(request(cookies, null, "GET"), "/auth/flow"),
    true,
  );
});

test("Server Guardは限定Cookieを業務認証として扱わず、追加認証画面へ戻す", async () => {
  const oldFetch = globalThis.fetch;
  const cookies = new Set(["mfa_flow", "csrf_token"]);
  const server = load("../lib/auth/server.ts", {
    "@/lib/auth/return-path": load("../lib/auth/return-path.ts", {
      "@/features/mcp/lib/navigation": load(
        "../features/mcp/lib/navigation.ts",
      ),
    }),
    "next/headers": {
      cookies: async () => ({ has: (name) => cookies.has(name) }),
      headers: async () => new Headers(),
    },
    "next/navigation": {
      redirect: (url) => {
        throw new Error(`redirect:${url}`);
      },
    },
    "@/lib/auth/session-events": { AUTH_ERROR_CODES: {} },
    "@/lib/security/csrf": csrf,
  });
  try {
    globalThis.fetch = () => {
      throw new Error("limited cookie must not fetch user");
    };
    assert.equal(await server.getCurrentUserOnServer(), null);
    await assert.rejects(server.requireUser(), /redirect:\/mfa$/);
  } finally {
    globalThis.fetch = oldFetch;
  }
});

test("旧通常セッションのMFA_REQUIREDは再ログインを要求する", async () => {
  const oldFetch = globalThis.fetch;
  const server = load("../lib/auth/server.ts", {
    "@/lib/auth/return-path": load("../lib/auth/return-path.ts", {
      "@/features/mcp/lib/navigation": load(
        "../features/mcp/lib/navigation.ts",
      ),
    }),
    "next/headers": {
      headers: async () => new Headers(),
      cookies: async () => ({
        has: (name) => name === "access_token",
        toString: () => "access_token=old",
      }),
    },
    "next/navigation": {
      redirect: (url) => {
        throw new Error(`redirect:${url}`);
      },
    },
    "@/lib/auth/session-events": { AUTH_ERROR_CODES: {} },
    "@/lib/security/csrf": csrf,
    "@/lib/security/backend": {
      authenticateBackendRequest: (headers) => headers,
    },
  });
  try {
    globalThis.fetch = async (_url, options) => {
      assert.equal(options.headers.get("Cookie"), "access_token=old");
      assert.equal(options.cache, "no-store");
      return Response.json({ code: "MFA_REQUIRED" }, { status: 403 });
    };
    await assert.rejects(
      server.requireUser(),
      /redirect:\/login\?reason=mfa-required$/,
    );
  } finally {
    globalThis.fetch = oldFetch;
  }
});

test("BFFはMFAの限定Cookieと通常Cookieへの切り替えを中継する", async () => {
  class ProxyResponse extends Response {
    static json(body, options) {
      return new ProxyResponse(JSON.stringify(body), options);
    }
  }
  const route = load("../app/api/[...path]/route.ts", {
    "next/server": { NextResponse: ProxyResponse },
    "@/lib/security/backend": {
      authenticateBackendRequest: (headers) => headers,
    },
    "@/lib/security/csrf": csrf,
  });
  const oldFetch = globalThis.fetch;
  try {
    const input = request({ mfa_flow: "limited", csrf_token: "csrf" }, "csrf");
    input.nextUrl = new URL("http://localhost:3000/api/auth/mfa/finish");
    input.headers.set("Cookie", "mfa_flow=limited; csrf_token=csrf");
    input.headers.set("Origin", "http://localhost:3000");
    input.arrayBuffer = async () => new ArrayBuffer(0);
    globalThis.fetch = async (url, options) => {
      assert.equal(url.pathname, "/auth/mfa/finish");
      assert.equal(
        options.headers.get("Cookie"),
        "mfa_flow=limited; csrf_token=csrf",
      );
      assert.equal(options.headers.get("X-CSRF-Token"), "csrf");
      const headers = new Headers({ "Cache-Control": "no-store" });
      headers.append("Set-Cookie", "mfa_flow=; Max-Age=0; HttpOnly; Path=/");
      headers.append("Set-Cookie", "access_token=verified; HttpOnly; Path=/");
      return Response.json({ next_step: "authenticated" }, { headers });
    };
    const result = await route.POST(input, {
      params: Promise.resolve({ path: ["auth", "mfa", "finish"] }),
    });
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("Cache-Control"), "no-store");
    assert.equal(result.headers.getSetCookie().length, 2);
    assert.match(result.headers.getSetCookie()[1], /access_token=verified/);
    assert.deepEqual(await result.json(), { next_step: "authenticated" });
  } finally {
    globalThis.fetch = oldFetch;
  }
});

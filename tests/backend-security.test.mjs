import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { isIP } from "node:net";
import ts from "typescript";

const source = ts.transpileModule(
  fs.readFileSync(
    new URL("../lib/security/backend.ts", import.meta.url),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const loaded = { exports: {} };
new Function("require", "module", "exports", source)(
  (name) => (name === "node:net" ? { isIP } : {}),
  loaded,
  loaded.exports,
);
const { authenticateBackendRequest } = loaded.exports;

const routeSource = ts.transpileModule(
  fs.readFileSync(
    new URL("../app/api/[...path]/route.ts", import.meta.url),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const route = { exports: {} };
class ProxyResponse extends Response {
  static json(body, options) {
    return new ProxyResponse(JSON.stringify(body), options);
  }
}
new Function("require", "module", "exports", routeSource)(
  (name) => {
    if (name === "next/server") return { NextResponse: ProxyResponse };
    if (name.endsWith("backend")) return { authenticateBackendRequest };
    return {
      validateCsrfToken: () => true,
      isCsrfProtectedMethod: () => false,
    };
  },
  route,
  route.exports,
);

test("共有キーとクライアントIPの偽装を上書きしCookieを維持する", () => {
  const oldEnv = {
    VERCEL: process.env.VERCEL,
    BFF_SHARED_SECRET: process.env.BFF_SHARED_SECRET,
  };
  try {
    process.env.VERCEL = "1";
    process.env.BFF_SHARED_SECRET = "s".repeat(48);
    const headers = authenticateBackendRequest(
      new Headers({
        "X-Syncnesto-BFF-Key": "spoofed",
        "X-Syncnesto-Client-IP": "1.1.1.1",
        Cookie: "access_token=jwt",
      }),
      new Headers({
        "x-vercel-forwarded-for": "192.0.2.5",
        "x-forwarded-for": "1.1.1.1",
      }),
    );
    assert.equal(headers.get("X-Syncnesto-BFF-Key"), "s".repeat(48));
    assert.equal(headers.get("X-Syncnesto-Client-IP"), "192.0.2.5");
    assert.equal(headers.get("Cookie"), "access_token=jwt");
    assert.equal(
      authenticateBackendRequest(new Headers()).get("X-Syncnesto-BFF-Key"),
      "s".repeat(48),
    );
    process.env.BFF_SHARED_SECRET = "short";
    assert.throws(() => authenticateBackendRequest(new Headers()), /required/);
  } finally {
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("ローカルでは内部用IPを信用せず、共有キーなしの開発を維持する", () => {
  const oldVercel = process.env.VERCEL;
  const oldSecret = process.env.BFF_SHARED_SECRET;
  try {
    delete process.env.VERCEL;
    delete process.env.BFF_SHARED_SECRET;
    const headers = authenticateBackendRequest(
      new Headers({
        "X-Syncnesto-Client-IP": "1.1.1.1",
        "X-Syncnesto-BFF-Key": "spoofed",
      }),
      new Headers({ "x-vercel-forwarded-for": "192.0.2.5" }),
    );
    assert.equal(headers.has("X-Syncnesto-Client-IP"), false);
    assert.equal(headers.has("X-Syncnesto-BFF-Key"), false);
  } finally {
    if (oldVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = oldVercel;
    if (oldSecret === undefined) delete process.env.BFF_SHARED_SECRET;
    else process.env.BFF_SHARED_SECRET = oldSecret;
  }
});

test("BFFは内部ヘッダーを応答へ漏らさず、キー未設定では上流を呼ばない", async () => {
  const oldVercel = process.env.VERCEL;
  const oldSecret = process.env.BFF_SHARED_SECRET;
  const oldFetch = globalThis.fetch;
  const request = {
    method: "GET",
    nextUrl: new URL("https://front.example/api/auth/me"),
    headers: new Headers({
      "X-Syncnesto-BFF-Key": "spoofed",
      Cookie: "access_token=jwt",
    }),
  };
  const context = { params: Promise.resolve({ path: ["auth", "me"] }) };
  try {
    process.env.VERCEL = "1";
    process.env.BFF_SHARED_SECRET = "s".repeat(48);
    globalThis.fetch = async (_url, options) => {
      assert.equal(options.headers.get("X-Syncnesto-BFF-Key"), "s".repeat(48));
      assert.equal(options.headers.get("Cookie"), "access_token=jwt");
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          "X-Syncnesto-BFF-Key": "s".repeat(48),
          "X-Syncnesto-Client-IP": "192.0.2.1",
          "Set-Cookie": "access_token=renewed; HttpOnly; Secure; SameSite=Lax",
        },
      });
    };
    const response = await route.exports.GET(request, context);
    assert.equal(response.status, 200);
    assert.equal(response.headers.has("X-Syncnesto-BFF-Key"), false);
    assert.equal(response.headers.has("X-Syncnesto-Client-IP"), false);
    assert.match(response.headers.get("Set-Cookie"), /HttpOnly; Secure/);
    assert.deepEqual(await response.json(), { ok: true });
    delete process.env.BFF_SHARED_SECRET;
    globalThis.fetch = () => {
      throw new Error("unexpected upstream call");
    };
    assert.equal((await route.exports.GET(request, context)).status, 503);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = oldVercel;
    if (oldSecret === undefined) delete process.env.BFF_SHARED_SECRET;
    else process.env.BFF_SHARED_SECRET = oldSecret;
  }
});

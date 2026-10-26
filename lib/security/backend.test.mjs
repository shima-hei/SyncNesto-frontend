import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("./backend.ts", import.meta.url), "utf8")
  .replace('import "server-only";', "")
  .replace(
    '"@vercel/oidc"',
    JSON.stringify(pathToFileURL(require.resolve("@vercel/oidc")).href),
  );
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { authenticateBackendRequest } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
const names = [
  "VERCEL",
  "VERCEL_ENV",
  "BFF_SHARED_SECRET",
  "BACKEND_PREVIEW_OIDC_ENABLED",
  "API_BASE_URL",
  "VERCEL_OIDC_TOKEN",
  "BACKEND_PREVIEW_OIDC_TOKEN",
];
const before = Object.fromEntries(
  names.map((name) => [name, process.env[name]]),
);
test.after(() => {
  for (const name of names) {
    if (before[name] === undefined) delete process.env[name];
    else process.env[name] = before[name];
  }
});

test("Previewの明示有効化時だけserverの短命tokenを使い、ブラウザー入力を上書きする", () => {
  Object.assign(process.env, {
    VERCEL: "1",
    VERCEL_ENV: "preview",
    BFF_SHARED_SECRET: "test-bff-shared-secret-long-enough",
    BACKEND_PREVIEW_OIDC_ENABLED: "true",
    API_BASE_URL: "https://qa-backend.vercel.app",
    VERCEL_OIDC_TOKEN: "server-short-lived-token",
    BACKEND_PREVIEW_OIDC_TOKEN: "configured-qa-token",
  });
  const result = authenticateBackendRequest(
    new Headers({
      "x-vercel-trusted-oidc-idp-token": "browser-supplied",
      "X-Syncnesto-BFF-Key": "forged",
    }),
    new Headers({ "x-vercel-forwarded-for": "192.0.2.1" }),
  );
  assert.equal(
    result.get("x-vercel-trusted-oidc-idp-token"),
    "server-short-lived-token",
  );
  assert.equal(
    result.get("X-Syncnesto-BFF-Key"),
    process.env.BFF_SHARED_SECRET,
  );
  assert.equal(result.get("X-Syncnesto-Client-IP"), "192.0.2.1");
});
test("Productionやflag OFFではtokenを転送せず、欠落/不正なPreview先は拒否する", () => {
  delete process.env.BACKEND_PREVIEW_OIDC_TOKEN;
  for (const [environment, enabled] of [
    ["production", "true"],
    ["preview", "false"],
  ]) {
    Object.assign(process.env, {
      VERCEL_ENV: environment,
      BACKEND_PREVIEW_OIDC_ENABLED: enabled,
    });
    assert.equal(
      authenticateBackendRequest(
        new Headers({ "x-vercel-trusted-oidc-idp-token": "forged" }),
      ).has("x-vercel-trusted-oidc-idp-token"),
      false,
    );
  }
  Object.assign(process.env, {
    VERCEL_ENV: "preview",
    BACKEND_PREVIEW_OIDC_ENABLED: "true",
    API_BASE_URL: "https://unrelated.example.com",
  });
  assert.throws(
    () => authenticateBackendRequest(new Headers()),
    /Vercel HTTPS/,
  );
  process.env.API_BASE_URL = "https://qa-backend.vercel.app";
  delete process.env.VERCEL_OIDC_TOKEN;
  assert.throws(() => authenticateBackendRequest(new Headers()), /missing/);
});

test("PreviewのSDK context欠落時だけserver設定の短命QA tokenを使う", () => {
  Object.assign(process.env, {
    VERCEL_ENV: "preview",
    BACKEND_PREVIEW_OIDC_ENABLED: "true",
    BACKEND_PREVIEW_OIDC_TOKEN: "configured-qa-token",
  });
  const result = authenticateBackendRequest(
    new Headers({ "x-vercel-trusted-oidc-idp-token": "forged" }),
  );
  assert.equal(
    result.get("x-vercel-trusted-oidc-idp-token"),
    "configured-qa-token",
  );
  process.env.VERCEL_ENV = "production";
  assert.equal(
    authenticateBackendRequest(new Headers()).has(
      "x-vercel-trusted-oidc-idp-token",
    ),
    false,
  );
  process.env.VERCEL_ENV = "preview";
  process.env.BACKEND_PREVIEW_OIDC_ENABLED = "false";
  assert.equal(
    authenticateBackendRequest(new Headers()).has(
      "x-vercel-trusted-oidc-idp-token",
    ),
    false,
  );
});

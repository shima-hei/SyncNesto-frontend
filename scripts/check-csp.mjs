import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";

const port = process.env.CSP_TEST_PORT ?? "4317";
const origin = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", port],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let output = "";
for (const stream of [server.stdout, server.stderr]) {
  stream.on("data", (chunk) => {
    output = `${output}${chunk}`.slice(-8000);
  });
}

async function readPage(headers) {
  const response = await fetch(`${origin}/login`, { headers });
  assert.equal(response.status, 200);
  const policy = response.headers.get("content-security-policy");
  assert.ok(policy);
  const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce, "CSPにnonceが必要");
  assert.ok(Buffer.from(nonce, "base64").length >= 32);
  assert.match(policy, /'strict-dynamic'/);
  assert.doesNotMatch(policy, /'unsafe-inline'|'unsafe-eval'/);
  assert.match(response.headers.get("cache-control"), /private/);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");

  const html = await response.text();
  const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map(([tag]) => tag);
  assert.ok(scripts.length > 0, "Next.jsの実際のHTMLを検証する");
  for (const tag of scripts) {
    assert.equal(tag.match(/nonce="([^"]+)"/)?.[1], nonce, tag);
  }
  assert.match(html, /syncnesto-theme/, "テーマ初期化スクリプトも検証する");
  return nonce;
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(output);
    if (!output.includes("Ready")) {
      await setTimeout(200);
      continue;
    }
    try {
      await fetch(`${origin}/login`, { signal: AbortSignal.timeout(1000) });
      ready = true;
      break;
    } catch {
      await setTimeout(200);
    }
  }
  assert.ok(ready, `Next.js起動失敗: ${output}`);
  const first = await readPage();
  const second = await readPage({
    "x-nonce": "attacker-controlled",
    "content-security-policy": "script-src 'unsafe-inline'",
  });
  assert.notEqual(first, second, "nonceをリクエスト間で再利用しない");
  assert.notEqual(second, "attacker-controlled", "外部nonceを信用しない");
  console.log(
    "Production CSP: SSR・テーマのnonce、偽装拒否、キャッシュ制限を確認",
  );
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => {
    if (server.exitCode !== null) return resolve();
    const timeout = globalThis.setTimeout(() => server.kill("SIGKILL"), 3000);
    server.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

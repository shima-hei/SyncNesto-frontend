import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = ts.transpileModule(
  fs.readFileSync(
    new URL(
      "../features/artifact-publications/lib/download-bytes.ts",
      import.meta.url,
    ),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const loaded = { exports: {} };
new Function("require", "module", "exports", source)(
  () => ({}),
  loaded,
  loaded.exports,
);
const { readSharedDownload } = loaded.exports;
const url =
  "http://localhost:18333/private-delivery/delivery-v1/" + "a".repeat(64);
const file = {
  filename: "確認.txt",
  byte_size: 3,
  content_digest:
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
};

test("配信先へCookieや内部headerを送らず、確認したhashのbytesだけ返す", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.credentials, "omit");
    assert.equal(options.cache, "no-store");
    assert.equal(options.referrerPolicy, "no-referrer");
    assert.equal(options.redirect, "error");
    assert.equal(options.headers, undefined);
    return new Response("abc");
  };
  try {
    const blob = await readSharedDownload(
      url,
      file,
      new AbortController().signal,
    );
    assert.equal(await blob.text(), "abc");
  } finally {
    globalThis.fetch = previous;
  }
});

test("誤った配信先・上限超過・取消済みならネットワークへ進まない", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("unexpected network");
  };
  try {
    await assert.rejects(
      readSharedDownload(
        "https://outside.example/file",
        file,
        new AbortController().signal,
      ),
      /配信先/,
    );
    await assert.rejects(
      readSharedDownload(
        url,
        { ...file, byte_size: 20 * 1024 * 1024 + 1 },
        new AbortController().signal,
      ),
      /配信先/,
    );
    const abort = new AbortController();
    abort.abort();
    await assert.rejects(readSharedDownload(url, file, abort.signal), {
      name: "AbortError",
    });
  } finally {
    globalThis.fetch = previous;
  }
});

test("同じサイズの内容改変と途中切れを保存可能なBlobへ変換しない", async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("xyz");
    await assert.rejects(
      readSharedDownload(url, file, new AbortController().signal),
      /内容/,
    );
    globalThis.fetch = async () => new Response("ab");
    await assert.rejects(
      readSharedDownload(url, file, new AbortController().signal),
      /全体/,
    );
  } finally {
    globalThis.fetch = previous;
  }
});

test("超過streamとStorageの失効応答をcancelして破棄する", async () => {
  const previous = globalThis.fetch;
  let cancelled = 0;
  try {
    globalThis.fetch = async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("too long"));
          },
          cancel() {
            cancelled += 1;
          },
        }),
      );
    await assert.rejects(
      readSharedDownload(url, file, new AbortController().signal),
      /サイズ/,
    );
    globalThis.fetch = async () =>
      new Response(
        new ReadableStream({
          cancel() {
            cancelled += 1;
          },
        }),
        { status: 403 },
      );
    await assert.rejects(
      readSharedDownload(url, file, new AbortController().signal),
      /取得/,
    );
    assert.equal(cancelled, 2);
  } finally {
    globalThis.fetch = previous;
  }
});

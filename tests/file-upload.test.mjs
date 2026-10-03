import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = ts.transpileModule(
  fs.readFileSync(
    new URL("../lib/api/file-upload.ts", import.meta.url),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const loaded = { exports: {} };
new Function("require", "module", "exports", source)(
  () => ({ API_ERROR_FALLBACK_MESSAGES: { fileUpload: "upload failed" } }),
  loaded,
  loaded.exports,
);
const { fileUploadMetadata, uploadWithPlan } = loaded.exports;

test("server方式ではストレージに直接送信しない", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("unexpected fetch");
  };
  try {
    const result = await uploadWithPlan(
      new Blob(["test"]),
      { mode: "server" },
      async () => "server result",
      async () => {
        throw new Error("unexpected complete");
      },
    );
    assert.equal(result, "server result");
  } finally {
    globalThis.fetch = original;
  }
});

test("presigned方式ではCookieを送らず、送信成功後だけ登録する", async () => {
  const original = globalThis.fetch;
  const file = new Blob(["x".repeat(5 * 1024 * 1024)], { type: "text/plain" });
  let putCalled = false;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://storage.example/pending");
    assert.equal(options.method, "PUT");
    assert.equal(options.body, file);
    assert.equal(options.credentials, "omit");
    assert.deepEqual(options.headers, { "Content-Type": "text/plain" });
    putCalled = true;
    return new Response(null, { status: 200 });
  };
  try {
    assert.deepEqual(fileUploadMetadata(file, "a.txt"), {
      filename: "a.txt",
      content_type: "text/plain",
      byte_size: file.size,
    });
    const result = await uploadWithPlan(
      file,
      {
        mode: "presigned",
        url: "https://storage.example/pending",
        headers: { "Content-Type": "text/plain" },
        upload_token: "permission",
      },
      async () => {
        throw new Error("unexpected server upload");
      },
      async (token) => {
        assert.equal(putCalled, true);
        assert.equal(token, "permission");
        return "complete result";
      },
    );
    assert.equal(result, "complete result");
  } finally {
    globalThis.fetch = original;
  }
});

test("ストレージへの送信が失敗した場合は登録しない", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 403 });
  let completed = false;
  try {
    await assert.rejects(
      uploadWithPlan(
        new Blob(["test"]),
        {
          mode: "presigned",
          url: "https://storage.example/pending",
          upload_token: "permission",
        },
        async () => "server",
        async () => {
          completed = true;
        },
      ),
      /upload failed/,
    );
    assert.equal(completed, false);
  } finally {
    globalThis.fetch = original;
  }
});

test("不完全な送信計画ではアップロードしない", async () => {
  await assert.rejects(
    uploadWithPlan(
      new Blob(["test"]),
      { mode: "presigned" },
      async () => "server",
      async () => "completed",
    ),
    /upload failed/,
  );
});

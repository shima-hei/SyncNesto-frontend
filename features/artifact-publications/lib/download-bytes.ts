import type { PublicFile } from "@/lib/api/generated/model";

const MAX_BYTES = 20 * 1024 * 1024;
const sharedFilePath =
  /^\/api\/shared\/publications\/[a-f0-9-]{36}\/files\/[a-f0-9-]{36}\/content\?revision=[a-f0-9]{64}$/i;

export function sharedFileContentPath(
  publicationId: string,
  fileId: string,
  revision: string,
): string {
  return `/api/shared/publications/${encodeURIComponent(publicationId)}/files/${encodeURIComponent(fileId)}/content?revision=${encodeURIComponent(revision)}`;
}

export async function readSharedDownload(
  url: string,
  file: PublicFile,
  signal: AbortSignal,
): Promise<Blob> {
  const sameOrigin = sharedFilePath.test(url);
  const target = new URL(url, "http://localhost");
  if (
    (!sameOrigin &&
      (target.protocol !== "http:" ||
        !["localhost", "127.0.0.1"].includes(target.hostname) ||
        target.username ||
        target.password ||
        target.hash ||
        !/^\/[^/]+\/delivery-v1\/[a-f0-9]{64}$/.test(target.pathname))) ||
    file.byte_size < 1 ||
    file.byte_size > MAX_BYTES
  )
    throw new Error("配信先を確認できません");
  signal.throwIfAborted();
  const response = await fetch(sameOrigin ? url : target, {
    credentials: sameOrigin ? "same-origin" : "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer",
    redirect: "error",
    signal,
  });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error("添付を取得できません");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > file.byte_size || size > MAX_BYTES)
        throw new Error("添付サイズが一致しません");
      chunks.push(next.value);
    }
    if (size !== file.byte_size) throw new Error("添付全体を取得できません");
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    signal.throwIfAborted();
    const digest = [...new Uint8Array(hash)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
    if (digest !== file.content_digest)
      throw new Error("添付の内容が一致しません");
    return new Blob([bytes], { type: "application/octet-stream" });
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

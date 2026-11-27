"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { PublicFile } from "@/lib/api/generated/model";
import { displayBytes } from "@/features/artifact-releases/lib/display";
import {
  readSharedDownload,
  sharedFileContentPath,
} from "../lib/download-bytes";

export function SharedAttachments({
  publicationId,
  files,
  downloadAllowed,
  revision,
  signal,
}: {
  publicationId: string;
  files: PublicFile[];
  downloadAllowed: boolean;
  revision: string;
  signal?: AbortSignal;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [phase, setPhase] = useState("");
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const blobs = useRef(new Set<string>());
  useEffect(() => {
    const abort = () => {
      generation.current += 1;
      controller.current?.abort();
      for (const value of blobs.current) URL.revokeObjectURL(value);
      blobs.current.clear();
    };
    const parent = signal;
    parent?.addEventListener("abort", abort, { once: true });
    if (parent?.aborted) abort();
    return () => {
      parent?.removeEventListener("abort", abort);
      abort();
    };
  }, [signal]);

  const cancel = (file: PublicFile) => {
    generation.current += 1;
    controller.current?.abort();
    setActive(null);
    setFeedback((old) => ({ ...old, [file.id]: "取り消しました" }));
  };
  const start = useCallback(
    async (file: PublicFile) => {
      if (
        !signal ||
        signal.aborted ||
        document.visibilityState !== "visible" ||
        !navigator.onLine
      )
        return;
      const current = ++generation.current;
      const operation = new AbortController();
      controller.current?.abort();
      controller.current = operation;
      const abort = () => operation.abort();
      signal.addEventListener("abort", abort, { once: true });
      const valid = () =>
        current === generation.current &&
        !operation.signal.aborted &&
        !signal.aborted &&
        document.visibilityState === "visible" &&
        navigator.onLine;
      setActive(file.id);
      setPhase("取得中");
      setFeedback((old) => ({ ...old, [file.id]: "" }));
      try {
        const blob = await readSharedDownload(
          sharedFileContentPath(publicationId, file.id, revision),
          file,
          operation.signal,
        );
        if (!valid()) return;
        const href = URL.createObjectURL(blob);
        blobs.current.add(href);
        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.download = file.filename;
        anchor.rel = "noopener noreferrer";
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => {
          URL.revokeObjectURL(href);
          blobs.current.delete(href);
        }, 1000);
        setFeedback((old) => ({ ...old, [file.id]: "保存を開始しました" }));
      } catch {
        if (valid())
          setFeedback((old) => ({
            ...old,
            [file.id]:
              "取得できませんでした。閲覧許可を再確認して、もう一度操作してください。",
          }));
      } finally {
        signal.removeEventListener("abort", abort);
        if (current === generation.current) setActive(null);
      }
    },
    [signal, publicationId, revision],
  );
  return (
    <section
      aria-label="共有された添付一覧"
      className="flex min-w-0 flex-col gap-3"
    >
      <h2 className="font-semibold">添付ファイル</h2>
      <ul className="flex flex-col gap-3">
        {files.map((file) => (
          <li
            key={file.id}
            aria-busy={active === file.id}
            className="flex min-w-0 flex-col gap-2"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="min-w-0 break-all text-sm">
                {file.filename} · {displayBytes(file.byte_size)}
              </span>
              {downloadAllowed && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={active !== null || !signal}
                  onClick={() => void start(file)}
                  aria-label={`${file.filename}をダウンロード`}
                >
                  {active === file.id ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      {phase}
                    </>
                  ) : (
                    "ダウンロード"
                  )}
                </Button>
              )}
              {active === file.id ? (
                <Button variant="ghost" size="sm" onClick={() => cancel(file)}>
                  取消
                </Button>
              ) : null}
            </div>
            {signal &&
            [
              "image/png",
              "image/jpeg",
              "image/gif",
              "image/webp",
              "image/avif",
            ].includes(file.content_type) ? (
              <Image
                unoptimized
                loading="lazy"
                width={320}
                height={180}
                className="h-auto max-h-72 max-w-full rounded-md border object-contain object-left"
                src={
                  sharedFileContentPath(publicationId, file.id, revision) +
                  "&inline=true"
                }
                alt={file.filename}
              />
            ) : null}
            <p aria-live="polite" className="text-sm text-muted-foreground">
              {feedback[file.id]}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        {!files.length
          ? "添付なし"
          : "共有された固定内容の添付です。保存したファイルは公開停止後も手元に残ります。"}
      </p>
    </section>
  );
}

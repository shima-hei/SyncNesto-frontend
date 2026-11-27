"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ImageOffIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api/client";
import type { CommentImageRead } from "@/lib/api/generated/model";

type VisibleCommentImage = Pick<CommentImageRead, "id" | "filename">;

function AuthorizedCommentImage({
  image,
  expanded,
  path,
  signal,
}: {
  image: VisibleCommentImage;
  expanded?: boolean;
  path: string;
  signal?: AbortSignal;
}) {
  const [result, setResult] = useState<string | null | false>(null);
  useEffect(() => {
    const abort = new AbortController();
    let url: string | undefined;
    const stop = () => {
      abort.abort();
      if (url) URL.revokeObjectURL(url);
    };
    if (signal?.aborted) return;
    signal?.addEventListener("abort", stop, { once: true });
    // 画像にも通常のAPIと同じ組織・デモのContextを付ける。
    void apiClient<Blob>(path, {
      method: "GET",
      signal: abort.signal,
      responseType: "blob",
    })
      .then((blob) => {
        if (abort.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setResult(url);
      })
      .catch(() => {
        if (!abort.signal.aborted) setResult(false);
      });
    return () => {
      signal?.removeEventListener("abort", stop);
      stop();
    };
  }, [path, signal]);

  if (!result) {
    return (
      <span className="flex h-20 w-28 items-center justify-center gap-1 text-xs text-muted-foreground">
        {result === false ? (
          <>
            <ImageOffIcon className="size-4" aria-hidden="true" />
            表示できません
          </>
        ) : (
          <Spinner aria-label="画像を読み込み中" />
        )}
      </span>
    );
  }
  return (
    <Image
      width={expanded ? 1024 : 120}
      height={expanded ? 768 : 80}
      src={result}
      alt={image.filename}
      unoptimized
      className={
        expanded
          ? "mx-auto max-h-[75dvh] w-auto max-w-full object-contain"
          : "h-20 w-28 object-contain"
      }
    />
  );
}

export function CommentImageGallery({
  images,
  imagePath,
  signal,
}: {
  images?: (CommentImageRead | VisibleCommentImage)[] | null;
  imagePath?: (identity: string) => string;
  signal?: AbortSignal;
}) {
  const [closedSignal, setClosedSignal] = useState<AbortSignal>();
  useEffect(() => {
    if (!signal) return;
    const close = () => setClosedSignal(signal);
    signal.addEventListener("abort", close, { once: true });
    return () => signal.removeEventListener("abort", close);
  }, [signal]);
  if (
    !images?.length ||
    (signal && (signal.aborted || closedSignal === signal))
  )
    return null;
  return (
    <ul
      role="list"
      aria-label="添付画像"
      className="flex min-w-0 flex-wrap gap-2 pt-1"
    >
      {images.map((item) => {
        const path =
          imagePath?.(item.id) ??
          ("project_id" in item
            ? `/projects/${item.project_id}/comment-images/${item.id}`
            : undefined);
        if (!path) return null;
        return (
          <li key={item.id}>
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  aria-label={`${item.filename}を拡大`}
                  title={item.filename}
                  className="block overflow-hidden rounded-md border border-border/60 bg-muted/50 hover:border-ring focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <AuthorizedCommentImage
                    image={item}
                    path={path}
                    signal={signal}
                  />
                </button>
              </DialogTrigger>
              <DialogContent
                aria-describedby={undefined}
                className="sm:max-w-4xl"
              >
                <DialogTitle className="me-8 [overflow-wrap:anywhere]">
                  {item.filename}
                </DialogTitle>
                <AuthorizedCommentImage
                  image={item}
                  path={path}
                  signal={signal}
                  expanded
                />
              </DialogContent>
            </Dialog>
          </li>
        );
      })}
    </ul>
  );
}

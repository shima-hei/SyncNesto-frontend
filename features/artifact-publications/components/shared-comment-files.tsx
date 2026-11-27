"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CommentImageGallery } from "@/components/shared/comments/comment-image-gallery";
import {
  commentImageTypes,
  useCommentDraftFiles,
} from "@/components/shared/comments/comment-compose-media";
import { displayBytes } from "@/features/artifact-releases/lib/display";
import { apiClient } from "@/lib/api/client";
import { fileUploadMetadata, uploadWithPlan } from "@/lib/api/file-upload";
import type {
  FileUploadPlan,
  SharedCommentFileRead,
} from "@/lib/api/generated/model";

const fileTypes = [
  ...commentImageTypes,
  "application/pdf",
  "text/plain",
  "application/json",
];
export const sharedCommentFileAccept = [
  ...fileTypes,
  ".txt",
  ".csv",
  ".md",
  ".json",
].join(",");

export function commentPath(publicationId: string, projectId?: number) {
  return projectId
    ? `/projects/${projectId}/artifact-publications/${publicationId}/comments`
    : `/shared/publications/${publicationId}/comments`;
}

export function useSharedCommentFileDraft(
  base: string,
  signal: AbortSignal | undefined,
  onChange: () => void,
) {
  const files = `${base}/files`;
  return useCommentDraftFiles({
    acceptedTypes: fileTypes,
    messages: {
      invalid:
        "PNG・JPEG・WebP、PDF、テキスト、JSON のファイルを3 MiB以下で選択してください。",
      count: "1件のコメントにファイルを4件まで添付できます。",
      failed: "添付を送信できませんでした。もう一度お試しください。",
    },
    normalize: (file) => {
      const name = file.name.toLowerCase();
      const type = /\.(csv|md|txt)$/.test(name)
        ? "text/plain"
        : name.endsWith(".json")
          ? "application/json"
          : file.type;
      return type === file.type
        ? file
        : new File([file], file.name, {
            type,
            lastModified: file.lastModified,
          });
    },
    onChange,
    upload: async (file, requestId) => {
      const plan = await apiClient<FileUploadPlan>(`${files}/plan`, {
        method: "POST",
        body: JSON.stringify(fileUploadMetadata(file, file.name)),
        signal,
      });
      return uploadWithPlan(
        file,
        plan,
        () => {
          const data = new FormData();
          data.set("request_id", requestId);
          data.set("file", file);
          return apiClient<SharedCommentFileRead>(files, {
            method: "POST",
            body: data,
            signal,
          });
        },
        (token) =>
          apiClient<SharedCommentFileRead>(`${files}/complete`, {
            method: "POST",
            body: JSON.stringify({ upload_token: token }),
            signal,
          }),
        signal,
      );
    },
    discard: (id) =>
      apiClient<void>(`${files}/${id}`, { method: "DELETE", signal }),
  });
}

export function SharedCommentFiles({
  base,
  files,
  downloadAllowed,
  signal,
}: {
  base: string;
  files?: SharedCommentFileRead[];
  downloadAllowed: boolean;
  signal?: AbortSignal;
}) {
  if (!files?.length || !signal || signal.aborted) return null;
  const path = (id: string) => `${base}/files/${id}/content`;
  return (
    <div className="grid min-w-0 gap-2">
      <CommentImageGallery
        images={files.filter((file) =>
          commentImageTypes.includes(file.content_type),
        )}
        imagePath={(id) => `${path(id)}?inline=true`}
        signal={signal}
      />
      <ul aria-label="コメントの添付ファイル" className="grid gap-1 text-xs">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex flex-wrap items-center gap-2 [overflow-wrap:anywhere]"
          >
            <span>
              {file.filename} · {displayBytes(file.byte_size)}
            </span>
            {downloadAllowed && (
              <CommentFileDownload
                file={file}
                path={path(file.id)}
                signal={signal}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommentFileDownload({
  file,
  path,
  signal,
}: {
  file: SharedCommentFileRead;
  path: string;
  signal: AbortSignal;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function download() {
    if (signal.aborted || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const content = await apiClient<Blob>(path, {
        method: "GET",
        responseType: "blob",
        signal,
      });
      signal.throwIfAborted();
      if (content.size !== file.byte_size)
        throw new Error("添付サイズが一致しません");
      const url = URL.createObjectURL(content);
      const target = document.createElement("a");
      target.href = url;
      target.download = file.filename;
      target.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (!signal.aborted) setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`${file.filename}をダウンロード`}
        disabled={busy}
        onClick={() => void download()}
      >
        {busy ? "取得中…" : "ダウンロード"}
      </Button>
      {failed && (
        <span role="alert" className="text-destructive">
          添付を取得できませんでした。
        </span>
      )}
    </>
  );
}

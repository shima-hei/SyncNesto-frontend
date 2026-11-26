"use client";

import Image from "next/image";
import { AtSignIcon, PaperclipIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ClipboardEvent, DragEvent, ReactNode } from "react";

import {
  LinkInsertPopover,
  type LinkEditorChange,
} from "@/components/shared/smart-links/link-insert-popover";
import { DraftLinkPreview } from "@/components/shared/smart-links/draft-link-preview";
import type { CommentImageRead } from "@/lib/api/generated/model";
import {
  completeCommentImageProjectsProjectIdCommentImagesKindUploadCompletePost as complete,
  discardCommentImageProjectsProjectIdCommentImagesImageIdDelete as discard,
  planCommentImageProjectsProjectIdCommentImagesKindUploadPlanPost as plan,
  uploadCommentImageProjectsProjectIdCommentImagesKindUploadPost as upload,
} from "@/lib/api/generated/comment-images/comment-images";
import { fileUploadMetadata, uploadWithPlan } from "@/lib/api/file-upload";
import { CommentIconButton } from "./comment-thread-actions";

type ImageKind = "task" | "requirement" | "specification" | "test_design";
type PendingImage = {
  file: File;
  preview: string;
  uploaded?: CommentImageRead;
};
const acceptedTypes = ["image/png", "image/jpeg", "image/webp"];
const sizeLimit = 3 * 1024 * 1024;
const countLimit = 4;

export function useCommentComposeMedia(projectId: number, kind?: ImageKind) {
  const [images, setImages] = useState<PendingImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);
  const objectUrls = useRef(new Set<string>());

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const addFiles = (files: FileList | File[]) => {
    if (!kind || inFlight.current) return;
    const selected = Array.from(files);
    const allowed = selected.filter(
      (file) =>
        acceptedTypes.includes(file.type) &&
        file.size > 0 &&
        file.size <= sizeLimit,
    );
    const newImages = allowed
      .slice(0, Math.max(0, countLimit - images.length))
      .map((file) => {
        const preview = URL.createObjectURL(file);
        objectUrls.current.add(preview);
        return { file, preview };
      });
    setImages([...images, ...newImages]);
    setError(
      allowed.length !== selected.length
        ? "PNG・JPEG・WebPの画像を3 MiB以下で選択してください。"
        : newImages.length !== selected.length
          ? "1件のコメントに画像を4枚まで添付できます。"
          : null,
    );
  };

  const revoke = (preview: string) => {
    URL.revokeObjectURL(preview);
    objectUrls.current.delete(preview);
  };

  return {
    images,
    error,
    sending,
    addFiles: kind ? addFiles : undefined,
    remove: (image: PendingImage) => {
      if (inFlight.current) return;
      if (image.uploaded)
        void discard(projectId, image.uploaded.id).catch(() => undefined);
      revoke(image.preview);
      setImages((current) =>
        current.filter((item) => item.preview !== image.preview),
      );
      setError(null);
    },
    formEvents: kind
      ? {
          onPaste: (event: ClipboardEvent) => {
            if (!event.clipboardData.files.length) return;
            if (!event.clipboardData.getData("text/plain"))
              event.preventDefault();
            addFiles(event.clipboardData.files);
          },
          onDragOver: (event: DragEvent) => {
            if (event.dataTransfer.types.includes("Files"))
              event.preventDefault();
          },
          onDrop: (event: DragEvent) => {
            if (!event.dataTransfer.files.length) return;
            event.preventDefault();
            addFiles(event.dataTransfer.files);
          },
        }
      : {},
    send: async (submit: (ids: string[]) => Promise<boolean | void>) => {
      if (inFlight.current) return false;
      inFlight.current = true;
      setSending(true);
      setError(null);
      try {
        const ids: string[] = [];
        if (kind) {
          try {
            for (const image of images) {
              let saved = image.uploaded;
              if (!saved) {
                const { file } = image;
                const uploadPlan = await plan(
                  projectId,
                  kind,
                  fileUploadMetadata(file, file.name),
                );
                saved = await uploadWithPlan(
                  file,
                  uploadPlan,
                  () => upload(projectId, kind, { file }),
                  (token) => complete(projectId, kind, { upload_token: token }),
                );
                const uploaded = saved;
                setImages((current) =>
                  current.map((item) =>
                    item.preview === image.preview
                      ? { ...item, uploaded }
                      : item,
                  ),
                );
              }
              ids.push(saved.id);
            }
          } catch {
            setError("画像を送信できませんでした。もう一度お試しください。");
            return false;
          }
        }
        if ((await submit(ids)) === false) return false;
        images.forEach((image) => revoke(image.preview));
        setImages([]);
        return true;
      } finally {
        inFlight.current = false;
        setSending(false);
      }
    },
  };
}

export function CommentComposeTools({
  media,
  body,
  editor,
  onLinkChange,
  onMention,
  children,
}: {
  media: ReturnType<typeof useCommentComposeMedia>;
  body: string;
  editor: () => HTMLTextAreaElement | null;
  onLinkChange: (change: LinkEditorChange) => boolean | void;
  onMention?: () => void;
  children: ReactNode;
}) {
  const files = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <DraftLinkPreview value={body} />
      {media.images.length ? (
        <ul
          role="list"
          aria-label="投稿前の添付画像"
          className="flex flex-wrap gap-2"
        >
          {media.images.map((image) => (
            <li key={image.preview} className="relative w-20 shrink-0">
              <Image
                src={image.preview}
                alt={image.file.name}
                width={80}
                height={56}
                unoptimized
                className="h-14 w-20 rounded-md bg-muted object-contain"
              />
              <CommentIconButton
                label={`${image.file.name}を添付から外す`}
                variant="secondary"
                className="absolute end-0 top-0"
                disabled={media.sending}
                onClick={() => media.remove(image)}
              >
                <XIcon aria-hidden="true" />
              </CommentIconButton>
            </li>
          ))}
        </ul>
      ) : null}
      {media.error ? (
        <p role="alert" className="text-xs text-destructive">
          {media.error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <div className="flex items-center gap-0.5">
          {onMention ? (
            <CommentIconButton
              label="メンションを追加"
              onClick={onMention}
              disabled={media.sending}
            >
              <AtSignIcon aria-hidden="true" />
            </CommentIconButton>
          ) : null}
          {media.addFiles ? (
            <>
              <input
                ref={files}
                type="file"
                accept={acceptedTypes.join(",")}
                multiple
                hidden
                onChange={(event) => {
                  if (event.target.files?.length)
                    media.addFiles?.(event.target.files);
                  event.target.value = "";
                }}
              />
              <CommentIconButton
                label="画像を添付"
                onClick={() => files.current?.click()}
                disabled={media.sending || media.images.length >= countLimit}
              >
                <PaperclipIcon aria-hidden="true" />
              </CommentIconButton>
            </>
          ) : null}
          <LinkInsertPopover
            iconOnly
            editor={editor}
            onChange={onLinkChange}
            disabled={media.sending}
          />
        </div>
        {children}
      </div>
    </div>
  );
}

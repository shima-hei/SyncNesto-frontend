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
  uploaded?: { id: string };
  requestId: string;
};
export const commentImageTypes = ["image/png", "image/jpeg", "image/webp"];
const sizeLimit = 3 * 1024 * 1024;
const countLimit = 4;

type FileDraftOptions = {
  upload: (file: File, requestId: string) => Promise<{ id: string }>;
  discard: (id: string) => Promise<unknown>;
  acceptedTypes: readonly string[];
  messages: { invalid: string; count: string; failed: string };
  normalize?: (file: File) => File;
  onChange?: () => void;
};

export function useCommentComposeMedia(projectId: number, kind?: ImageKind) {
  return useCommentDraftFiles(
    kind
      ? {
          upload: async (file) => {
            const uploadPlan = await plan(
              projectId,
              kind,
              fileUploadMetadata(file, file.name),
            );
            return uploadWithPlan(
              file,
              uploadPlan,
              () => upload(projectId, kind, { file }),
              (token) => complete(projectId, kind, { upload_token: token }),
            );
          },
          discard: (identity) => discard(projectId, identity),
          acceptedTypes: commentImageTypes,
          messages: {
            invalid: "PNG・JPEG・WebPの画像を3 MiB以下で選択してください。",
            count: "1件のコメントに画像を4枚まで添付できます。",
            failed: "画像を送信できませんでした。もう一度お試しください。",
          },
        }
      : undefined,
  );
}

export function useCommentDraftFiles(options?: FileDraftOptions) {
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
    if (!options || inFlight.current) return;
    const selected = Array.from(
      files,
      (file) => options.normalize?.(file) ?? file,
    );
    const allowed = selected.filter(
      (file) =>
        options.acceptedTypes.includes(file.type) &&
        file.size > 0 &&
        file.size <= sizeLimit,
    );
    const newImages = allowed
      .slice(0, Math.max(0, countLimit - images.length))
      .map((file) => {
        const preview = URL.createObjectURL(file);
        objectUrls.current.add(preview);
        return { file, preview, requestId: crypto.randomUUID() };
      });
    setImages([...images, ...newImages]);
    if (newImages.length) options.onChange?.();
    setError(
      allowed.length !== selected.length
        ? options.messages.invalid
        : newImages.length !== selected.length
          ? options.messages.count
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
    addFiles: options ? addFiles : undefined,
    maxFiles: countLimit,
    remove: (image: PendingImage) => {
      if (inFlight.current) return;
      if (image.uploaded && options)
        void options.discard(image.uploaded.id).catch(() => undefined);
      options?.onChange?.();
      revoke(image.preview);
      setImages((current) =>
        current.filter((item) => item.preview !== image.preview),
      );
      setError(null);
    },
    formEvents: options
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
        if (options) {
          try {
            for (const image of images) {
              let saved = image.uploaded;
              if (!saved) {
                saved = await options.upload(image.file, image.requestId);
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
            setError(options.messages.failed);
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
  return (
    <div className="space-y-2">
      <DraftLinkPreview value={body} />
      <CommentDraftFileList media={media} label="投稿前の添付画像" />
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
          <CommentAttachButton
            media={media}
            label="画像を添付"
            accept={commentImageTypes.join(",")}
          />
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

export function CommentDraftFileList({
  media,
  label,
}: {
  media: ReturnType<typeof useCommentDraftFiles>;
  label: string;
}) {
  return (
    <>
      {media.images.length ? (
        <ul role="list" aria-label={label} className="flex flex-wrap gap-2">
          {media.images.map((image) => (
            <li key={image.preview} className="relative w-20 shrink-0">
              {commentImageTypes.includes(image.file.type) ? (
                <Image
                  src={image.preview}
                  alt={image.file.name}
                  width={80}
                  height={56}
                  unoptimized
                  className="h-14 w-20 rounded-md bg-muted object-contain"
                />
              ) : (
                <span className="block break-words rounded-md bg-muted px-2 py-4 text-xs">
                  {image.file.name}
                </span>
              )}
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
    </>
  );
}

export function CommentAttachButton({
  media,
  label,
  accept,
}: {
  media: ReturnType<typeof useCommentDraftFiles>;
  label: string;
  accept: string;
}) {
  const files = useRef<HTMLInputElement>(null);
  return (
    <>
      {media.addFiles ? (
        <>
          <input
            ref={files}
            type="file"
            accept={accept}
            multiple
            hidden
            onChange={(event) => {
              if (event.target.files?.length)
                media.addFiles?.(event.target.files);
              event.target.value = "";
            }}
          />
          <CommentIconButton
            label={label}
            onClick={() => files.current?.click()}
            disabled={media.sending || media.images.length >= media.maxFiles}
          >
            <PaperclipIcon aria-hidden="true" />
          </CommentIconButton>
        </>
      ) : null}
    </>
  );
}

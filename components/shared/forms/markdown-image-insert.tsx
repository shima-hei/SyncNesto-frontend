"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
  type TextareaHTMLAttributes,
} from "react";
import { ImagePlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { discardBodyImage, uploadBodyImage } from "@/lib/api/body-image-upload";
import { textareaDropOffset } from "@/lib/comments/textarea-drop-offset";
import {
  bodyImagePrefix,
  imageMarkdown,
  pendingBodyImages,
  pendingImageMarkdown,
  type BodyImageScope,
} from "@/lib/markdown-body-images";

const acceptedTypes = ["image/png", "image/jpeg", "image/webp"];
const maxImages = 24;
const maxBytes = 3 * 1024 * 1024;

type Job = {
  id: string;
  file: File;
  marker: string;
  path: string;
  error?: string;
};

export function useMarkdownImageInsert({
  value,
  onChange,
  scope,
  textarea,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  scope?: BodyImageScope;
  textarea: RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
}) {
  const path = scope
    ? `/projects/${scope.projectId}/body-images/${scope.kind}`
    : "";
  const latest = useRef({ value, onChange, path });
  useLayoutEffect(() => {
    latest.current = { value, onChange, path };
  }, [value, onChange, path]);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [notice, setNotice] = useState("");
  const picker = useRef<HTMLInputElement>(null);
  const pickerRange = useRef<{
    value: string;
    path: string;
    start: number;
    end: number;
  } | null>(null);
  const pending = pendingBodyImages(value);

  function change(next: string) {
    latest.current.value = next;
    latest.current.onChange(next);
  }

  function replaceMarker(marker: string, replacement: string) {
    const current = latest.current.value;
    const start = current.indexOf(marker);
    if (start < 0) return;
    const end = start + marker.length;
    const next = current.slice(0, start) + replacement + current.slice(end);
    const editor = textarea.current;
    const selection =
      editor && editor === document.activeElement
        ? ([
            editor.selectionStart,
            editor.selectionEnd,
            editor.selectionDirection,
          ] as const)
        : null;
    change(next);
    if (!editor || !selection) return;
    const adjust = (offset: number) =>
      offset <= start
        ? offset
        : offset < end
          ? start + replacement.length
          : offset + replacement.length - marker.length;
    requestAnimationFrame(() => {
      if (
        textarea.current === editor &&
        editor === document.activeElement &&
        editor.value === next
      ) {
        editor.setSelectionRange(
          adjust(selection[0]),
          adjust(selection[1]),
          selection[2],
        );
      }
    });
  }

  async function run(job: Job) {
    try {
      const image = await uploadBodyImage(job.file, job.path);
      if (
        !mounted.current ||
        latest.current.path !== job.path ||
        !latest.current.value.includes(job.marker)
      ) {
        discardBodyImage(job.path, image.id);
        return;
      }
      const alt = image.filename.replace(/\.[^.]+$/, "") || "画像";
      replaceMarker(
        job.marker,
        imageMarkdown(alt, `${bodyImagePrefix}${image.id}`),
      );
    } catch (error) {
      if (mounted.current)
        setJobs((current) =>
          current.map((item) =>
            item.id === job.id
              ? {
                  ...item,
                  error:
                    error instanceof Error
                      ? error.message
                      : "画像をアップロードできませんでした。",
                }
              : item,
          ),
        );
      return;
    } finally {
      if (mounted.current && !latest.current.value.includes(job.marker)) {
        setJobs((current) => current.filter((item) => item.id !== job.id));
      }
    }
  }

  function insert(files: File[], start: number, end: number) {
    if (!path || disabled || !files.length) return;
    if (
      files.some(
        (file) =>
          !acceptedTypes.includes(file.type) ||
          !file.size ||
          file.size > maxBytes,
      )
    ) {
      setNotice("PNG・JPEG・WebPを1枚3 MiB以下で選んでください。");
      return;
    }
    if (files.length + pending.length > maxImages) {
      setNotice("先にアップロード中の画像を処理してください。");
      return;
    }
    setNotice("");
    const added = files.map((file) => {
      const id = crypto.randomUUID();
      return { id, file, path, marker: pendingImageMarkdown(id) };
    });
    const insertion = added.map((job) => job.marker).join(" ");
    change(
      latest.current.value.slice(0, start) +
        insertion +
        latest.current.value.slice(end),
    );
    setJobs((current) => [
      ...current.filter((job) => latest.current.value.includes(job.marker)),
      ...added,
    ]);
    const editor = textarea.current;
    if (editor) {
      requestAnimationFrame(() => {
        if (textarea.current !== editor) return;
        editor.focus();
        editor.setSelectionRange(
          start + insertion.length,
          start + insertion.length,
        );
      });
    }
    void (async () => {
      for (const job of added) {
        if (!mounted.current || !latest.current.value.includes(job.marker))
          continue;
        await run(job);
      }
    })();
  }

  function insertAtSelection(files: File[]) {
    const editor = textarea.current;
    if (editor) insert(files, editor.selectionStart, editor.selectionEnd);
  }

  const control = scope ? (
    <>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        title="画像を挿入"
        aria-label="画像を挿入"
        onClick={() => {
          const editor = textarea.current;
          if (!editor) return;
          pickerRange.current = {
            value: editor.value,
            path,
            start: editor.selectionStart,
            end: editor.selectionEnd,
          };
          picker.current?.click();
        }}
      >
        <ImagePlusIcon />
      </Button>
      <input
        ref={picker}
        type="file"
        accept={acceptedTypes.join(",")}
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          const range = pickerRange.current;
          pickerRange.current = null;
          if (
            range?.value === latest.current.value &&
            range.path === latest.current.path
          )
            insert(files, range.start, range.end);
          else if (files.length)
            setNotice("本文が変わりました。挿入位置を選び直してください。");
        }}
      />
    </>
  ) : null;
  const status = scope ? (
    <div role="status" className="space-y-1 text-xs empty:hidden">
      {notice ? <p className="text-destructive">{notice}</p> : null}
      {pending.map(({ id, marker }) => {
        const job = jobs.find((item) => item.id === id);
        return (
          <div key={id} className="flex flex-wrap items-center gap-2">
            {job && !job.error ? <Spinner aria-hidden="true" /> : null}
            <span className="break-all">
              {job
                ? `${job.file.name}：${job.error ?? "アップロード中"}`
                : "画像のアップロードを再開できません。"}
            </span>
            {job?.error ? (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => {
                  setJobs((current) =>
                    current.map((item) =>
                      item.id === id ? { ...item, error: undefined } : item,
                    ),
                  );
                  void run(job);
                }}
              >
                再試行
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                replaceMarker(marker, "");
                setJobs((current) => current.filter((item) => item.id !== id));
              }}
            >
              キャンセル
            </Button>
          </div>
        );
      })}
      {pending.length ? (
        <p>アップロードを完了するか、取り消してから保存してください。</p>
      ) : null}
    </div>
  ) : null;
  const editorProps: TextareaHTMLAttributes<HTMLTextAreaElement> = scope
    ? {
        onPaste: (event) => {
          const files = Array.from(event.clipboardData.files).filter((file) =>
            file.type.startsWith("image/"),
          );
          if (!files.length) return;
          event.preventDefault();
          insertAtSelection(files);
        },
        onDragOver: (event) => {
          if (event.dataTransfer.types.includes("Files"))
            event.preventDefault();
        },
        onDrop: (event) => {
          const files = Array.from(event.dataTransfer.files);
          if (!files.length) return;
          event.preventDefault();
          const offset = textareaDropOffset(
            event.currentTarget,
            event.clientX,
            event.clientY,
          );
          if (offset === null) insertAtSelection(files);
          else insert(files, offset, offset);
        },
      }
    : {};
  return { control, status, editorProps, change };
}

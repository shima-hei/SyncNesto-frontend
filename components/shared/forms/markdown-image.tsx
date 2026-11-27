"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ImageOffIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api/client";
import {
  getTenantSelectionSnapshot,
  subscribeTenantSelection,
} from "@/lib/api/tenant-context";
import { bodyImageId, bodyImagePrefix } from "@/lib/markdown-body-images";

export const PublicationImageScope = createContext<{
  publicationId: string;
  nodeId: string;
} | null>(null);

export function MarkdownImage({
  src,
  alt = "",
  inert,
}: {
  src?: string;
  alt?: string;
  inert?: boolean;
}) {
  const publication = useContext(PublicationImageScope);
  const tenant = useSyncExternalStore(
    subscribeTenantSelection,
    getTenantSelectionSnapshot,
    () => undefined,
  );
  const label = alt || "本文画像";
  if (!src) return <ImageUnavailable label={label} />;
  if (src.startsWith(`${bodyImagePrefix}pending/`)) {
    return (
      <span
        data-anchor-ignore=""
        data-anchor-image=""
        className="text-muted-foreground"
      >
        画像をアップロード中
      </span>
    );
  }
  const id = bodyImageId(src);
  if (id) {
    const path = publication
      ? `/shared/publications/${publication.publicationId}/nodes/${publication.nodeId}/body-images/${id}`
      : `/body-images/${id}`;
    return (
      <AuthorizedImage
        key={`${tenant}:${path}`}
        path={path}
        label={label}
        alt={alt}
      />
    );
  }
  if (inert) {
    return (
      <span data-anchor-ignore="" data-anchor-image="">
        画像: {alt}（{src}）
      </span>
    );
  }
  return <ExternalImage key={src} src={src} alt={alt} label={label} />;
}

function ExternalImage({
  src,
  alt,
  label,
}: {
  src: string;
  alt: string;
  label: string;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <ImageUnavailable label={label} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      data-anchor-ignore=""
      className="h-auto max-w-full"
      onError={() => setFailed(true)}
    />
  );
}

function ImageUnavailable({ label }: { label: string }) {
  return (
    <span
      data-anchor-ignore=""
      data-anchor-image=""
      className="inline-flex items-center gap-1 text-sm text-muted-foreground"
    >
      <ImageOffIcon className="size-4" aria-hidden="true" />
      {label}を表示できません
    </span>
  );
}

function AuthorizedImage({
  path,
  label,
  alt,
}: {
  path: string;
  label: string;
  alt: string;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [result, setResult] = useState<string | false | null>(null);
  useEffect(() => {
    const element = anchor.current;
    if (!element) return;
    const abort = new AbortController();
    let url: string | undefined;
    function load() {
      void apiClient<Blob>(path, {
        method: "GET",
        responseType: "blob",
        signal: abort.signal,
      })
        .then((blob) => {
          if (abort.signal.aborted) return;
          url = URL.createObjectURL(blob);
          setResult(url);
        })
        .catch(() => {
          if (!abort.signal.aborted) setResult(false);
        });
    }
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              if (!entry.isIntersecting) return;
              observer?.disconnect();
              load();
            },
            { rootMargin: "240px" },
          );
    if (observer) observer.observe(element);
    else load();
    return () => {
      observer?.disconnect();
      abort.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);

  return (
    <span
      ref={anchor}
      data-anchor-ignore=""
      data-anchor-image=""
      className="inline-block max-w-full align-middle"
    >
      {result === false ? (
        <ImageUnavailable label={label} />
      ) : result ? (
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label={`${label}を拡大`}
              title={label}
              className="block max-w-full rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result}
                alt={alt}
                decoding="async"
                className="h-auto max-w-full"
                onError={() => setResult(false)}
              />
            </button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined} className="sm:max-w-4xl">
            <DialogTitle className="me-8 break-words">{label}</DialogTitle>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result}
              alt={alt}
              className="mx-auto max-h-[75dvh] w-auto max-w-full object-contain"
            />
          </DialogContent>
        </Dialog>
      ) : (
        <span className="inline-flex min-h-10 items-center gap-1 text-sm text-muted-foreground">
          <Spinner aria-hidden="true" /> {label}を読み込み中
        </span>
      )}
    </span>
  );
}

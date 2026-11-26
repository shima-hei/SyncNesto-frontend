"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const initialWidth = 400;
const minWidth = 320;
const maxWidth = 560;
const widthEvent = "syncnesto-comment-pane-width";

function clampWidth(width: number) {
  return Math.min(maxWidth, Math.max(minWidth, Math.round(width)));
}

function subscribeWidth(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(widthEvent, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(widthEvent, notify);
  };
}

export function useCommentPaneWidth(userId: number | undefined) {
  const key = `syncnesto:comment-pane-width:${userId ?? "default"}`;
  const [temporaryWidth, setTemporaryWidth] = useState<number>();
  const savedWidth = useSyncExternalStore(
    subscribeWidth,
    () => {
      try {
        const value = Number(localStorage.getItem(key));
        return value > 0 && Number.isFinite(value)
          ? clampWidth(value)
          : initialWidth;
      } catch {
        return initialWidth;
      }
    },
    () => initialWidth,
  );

  const width = temporaryWidth ?? savedWidth;
  return {
    width,
    setTemporaryWidth: (value: number | undefined) =>
      setTemporaryWidth(value === undefined ? undefined : clampWidth(value)),
    saveWidth: (value: number) => {
      const accepted = clampWidth(value);
      try {
        localStorage.setItem(key, String(accepted));
        window.dispatchEvent(new Event(widthEvent));
        setTemporaryWidth(undefined);
      } catch {
        setTemporaryWidth(accepted);
      }
    },
  };
}

export function CommentPaneResizeHandle({
  pane,
  width,
  setTemporaryWidth,
  saveWidth,
  className,
}: ReturnType<typeof useCommentPaneWidth> & {
  pane: string;
  className?: string;
}) {
  const drag = useRef<{ pointer: number; start: number; width: number } | null>(
    null,
  );

  return (
    <div
      role="separator"
      aria-label="コメントペインの幅"
      aria-orientation="vertical"
      aria-controls={pane}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      aria-valuenow={width}
      aria-valuetext={`${width}px`}
      tabIndex={0}
      title="ドラッグまたは矢印キーで幅を変更。Enterで初期幅に戻す"
      className={cn(
        "absolute inset-y-0 -start-1.5 z-10 w-3 cursor-col-resize touch-none outline-none select-none after:absolute after:top-1/2 after:left-1/2 after:h-8 after:w-1 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-border hover:after:bg-ring focus-visible:after:bg-ring",
        className,
      )}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        drag.current = {
          pointer: event.pointerId,
          start: event.clientX,
          width,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (current?.pointer === event.pointerId) {
          setTemporaryWidth(current.width + current.start - event.clientX);
        }
      }}
      onPointerUp={(event) => {
        const current = drag.current;
        if (current?.pointer === event.pointerId) {
          drag.current = null;
          saveWidth(current.width + current.start - event.clientX);
        }
      }}
      onLostPointerCapture={() => {
        if (drag.current) {
          drag.current = null;
          setTemporaryWidth(undefined);
        }
      }}
      onKeyDown={(event) => {
        const widthByKey: Record<string, number> = {
          ArrowLeft: width + 16,
          ArrowRight: width - 16,
          Home: minWidth,
          End: maxWidth,
          Enter: initialWidth,
        };
        const next = widthByKey[event.key];
        if (typeof next === "number") {
          event.preventDefault();
          saveWidth(next);
        }
      }}
    />
  );
}

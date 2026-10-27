"use client";

import { useLayoutEffect, useRef } from "react";
import {
  documentPreviewSourceSearch,
  type PreviewSource,
} from "../lib/document-preview-navigation";

type ReturnPoint = {
  x: number;
  y: number;
  input?: { id: string; start: number; end: number; top: number };
};

export function useFullPreviewNavigation(activeTab: string) {
  const editorRef = useRef<HTMLDivElement>(null);
  const point = useRef<ReturnPoint | null>(null);
  const pending = useRef<"original" | PreviewSource | null>(null);
  const capture = () => {
    if (activeTab !== "requirements") return;
    const input = editorRef.current?.querySelector<HTMLTextAreaElement>(
      'textarea[id^="section-body-"]',
    );
    point.current = {
      x: window.scrollX,
      y: window.scrollY,
      input: input
        ? {
            id: input.id,
            start: input.selectionStart,
            end: input.selectionEnd,
            top: input.scrollTop,
          }
        : undefined,
    };
  };
  const resume = (source?: PreviewSource) => {
    pending.current = source ?? "original";
    const url = new URL(window.location.href);
    url.search = documentPreviewSourceSearch(url.search, source);
    url.hash = "";
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  };
  useLayoutEffect(() => {
    if (activeTab === "preview") {
      document
        .querySelector<HTMLElement>("[data-full-preview-trigger]")
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    if (activeTab !== "requirements" || !pending.current) return;
    const source = pending.current;
    pending.current = null;
    const frame = requestAnimationFrame(() => {
      if (source === "original") {
        const saved = point.current;
        const input = saved?.input
          ? document.getElementById(saved.input.id)
          : null;
        if (input instanceof HTMLTextAreaElement && saved?.input) {
          input.focus({ preventScroll: true });
          input.setSelectionRange(saved.input.start, saved.input.end);
          input.scrollTop = saved.input.top;
        }
        if (saved) window.scrollTo(saved.x, saved.y);
        return;
      }
      const target = source.requirementId
        ? editorRef.current?.querySelector<HTMLElement>(
            "[data-preview-requirement-source]",
          )
        : (document.getElementById(`section-body-${source.sectionId}`) ??
          editorRef.current?.querySelector<HTMLElement>(
            '[data-requirement-section-field="title"]',
          ));
      target?.scrollIntoView({ block: "center" });
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab]);
  return { editorRef, capture, resume };
}

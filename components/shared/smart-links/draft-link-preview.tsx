"use client";

import { useDeferredValue } from "react";
import { editorLinks } from "@/lib/smart-links/editor-links";
import { parseSmartLink } from "@/lib/smart-links/reference";
import { SmartLink, useSmartLinkOrigin } from "./smart-link";

export function DraftLinkPreview({ value }: { value: string }) {
  const draft = useDeferredValue(value);
  const origin = useSmartLinkOrigin();
  if (!origin || !/https?:\/\/|\/projects\/joined\//i.test(draft)) return null;
  const links = editorLinks(draft).filter((link) =>
    parseSmartLink(link.href, origin),
  );
  if (!links.length) return null;
  return (
    <div
      aria-label="リンクのプレビュー"
      className="max-h-28 space-y-1 overflow-y-auto border-s border-border/80 ps-2 text-sm"
    >
      {links.map((link) => (
        <div
          key={`${link.start}:${link.href}`}
          className="min-w-0 [overflow-wrap:anywhere]"
        >
          <SmartLink href={link.href} display={link.display} live>
            {link.text}
          </SmartLink>
        </div>
      ))}
    </div>
  );
}

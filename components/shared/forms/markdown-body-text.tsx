import { MarkdownPreview } from "./markdown-textarea";
import { bodyImagePrefix } from "@/lib/markdown-body-images";
import { LinkedText } from "@/components/shared/smart-links/linked-text";
import type { ReactNode } from "react";

export function MarkdownBodyText({
  value,
  liveLinks = true,
  renderText,
}: {
  value: string;
  liveLinks?: boolean;
  renderText?: (text: string) => ReactNode;
}) {
  if (value.includes(bodyImagePrefix)) {
    return (
      <MarkdownPreview
        liveLinks={liveLinks}
        inert={!liveLinks}
        value={value}
        className="min-h-0 rounded-none border-0 bg-transparent p-0"
      />
    );
  }
  return (
    <LinkedText text={value} liveLinks={liveLinks} renderText={renderText} />
  );
}

import { LinkedText } from "@/components/shared/smart-links/linked-text";
import { getMentionSegments, type TextMention } from "@/lib/comments/mentions";
import { Fragment, type ReactNode } from "react";

export function CommentContent<T extends TextMention>({
  body,
  mentions = [],
  linkify = true,
  liveLinks = true,
  renderText,
}: {
  body: string;
  mentions?: T[];
  linkify?: boolean;
  liveLinks?: boolean;
  renderText?: (text: string) => ReactNode;
}) {
  return getMentionSegments(body, mentions).map((segment, index) =>
    segment.mention ? (
      <span
        key={index}
        className="box-decoration-clone rounded-sm bg-[var(--status-info-bg)] text-[var(--status-info-fg)] outline outline-1 -outline-offset-1 outline-[var(--status-info-border)]"
        data-mention-user={
          "user_id" in segment.mention ? segment.mention.user_id : undefined
        }
      >
        {segment.text}
      </span>
    ) : renderText ? (
      <Fragment key={index}>{renderText(segment.text)}</Fragment>
    ) : linkify ? (
      <LinkedText key={index} text={segment.text} liveLinks={liveLinks} />
    ) : (
      segment.text
    ),
  );
}

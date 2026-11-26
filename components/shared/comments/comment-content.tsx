import { getMentionSegments, type Mention } from "@/lib/comments/mentions";
import { getCommentLinkSegments } from "@/lib/comments/links";

export function CommentContent({
  body,
  mentions = [],
  linkify = true,
}: {
  body: string;
  mentions?: Mention[];
  linkify?: boolean;
}) {
  return getMentionSegments(body, mentions).map((segment, index) =>
    segment.mention ? (
      <span
        key={index}
        className="box-decoration-clone rounded-sm bg-[var(--status-info-bg)] text-[var(--status-info-fg)] outline outline-1 -outline-offset-1 outline-[var(--status-info-border)]"
        data-mention-user={segment.mention.user_id}
      >
        {segment.text}
      </span>
    ) : linkify ? (
      getCommentLinkSegments(segment.text).map((part, partIndex) =>
        part.href ? (
          <a
            key={`${index}-${partIndex}`}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline decoration-primary/55 underline-offset-2 [overflow-wrap:anywhere] hover:decoration-primary focus-visible:outline-ring"
          >
            {part.text}
          </a>
        ) : (
          part.text
        ),
      )
    ) : (
      segment.text
    ),
  );
}

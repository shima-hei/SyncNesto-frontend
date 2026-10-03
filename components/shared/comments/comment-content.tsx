import { getMentionSegments, type Mention } from "@/lib/comments/mentions";

export function CommentContent({
  body,
  mentions = [],
}: {
  body: string;
  mentions?: Mention[];
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
    ) : (
      segment.text
    ),
  );
}

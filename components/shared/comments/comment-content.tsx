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
        className="rounded-sm bg-primary/10 text-primary"
        data-mention-user={segment.mention.user_id}
      >
        {segment.text}
      </span>
    ) : (
      segment.text
    ),
  );
}

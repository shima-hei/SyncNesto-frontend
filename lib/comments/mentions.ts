import { z } from "zod";
import type { CommentMentionOccurrence } from "@/lib/api/generated/model/commentMentionOccurrence";

export const commentMentionsSchema = z
  .array(
    z.object({
      user_id: z.number().int().positive(),
      start: z.number().int().nonnegative(),
      end: z.number().int().positive(),
      display_name: z.string().min(1),
    }),
  )
  .max(100);

export type Mention = CommentMentionOccurrence;
export type MentionPermission =
  "requirement:read" | "task:read" | "test_plan:read";
export type MentionQuery = { start: number; end: number; query: string };

export function getMentionQuery(
  body: string,
  cursor: number,
  mentions: Mention[],
): MentionQuery | null {
  if (
    mentions.some((mention) => cursor > mention.start && cursor <= mention.end)
  )
    return null;
  const match = body.slice(0, cursor).match(/(?:^|[\s(（「])@([^\s@]*)$/u);
  if (!match) return null;
  return { start: cursor - match[1].length - 1, end: cursor, query: match[1] };
}

export function reconcileMentions(
  before: string,
  after: string,
  mentions: Mention[],
  selection?: { start: number; end: number } | null,
): Mention[] {
  if (before === after) return mentions;
  let start = 0;
  let oldEnd = before.length;
  let newEnd = after.length;
  const insertedLength =
    after.length -
    before.length +
    ((selection?.end ?? 0) - (selection?.start ?? 0));
  if (
    selection &&
    insertedLength >= 0 &&
    before.slice(0, selection.start) === after.slice(0, selection.start) &&
    before.slice(selection.end) ===
      after.slice(selection.start + insertedLength)
  ) {
    start = selection.start;
    oldEnd = selection.end;
    newEnd = selection.start + insertedLength;
  } else {
    while (start < oldEnd && start < newEnd && before[start] === after[start])
      start++;
    while (
      oldEnd > start &&
      newEnd > start &&
      before[oldEnd - 1] === after[newEnd - 1]
    ) {
      oldEnd--;
      newEnd--;
    }
  }
  const delta = newEnd - oldEnd;
  return mentions
    .flatMap((mention) => {
      if (mention.end <= start) return [mention];
      if (mention.start >= oldEnd)
        return [
          {
            ...mention,
            start: mention.start + delta,
            end: mention.end + delta,
          },
        ];
      return [];
    })
    .filter(
      (mention) =>
        after.slice(mention.start, mention.end) === `@${mention.display_name}`,
    );
}

export function getMentionSegments(body: string, mentions: Mention[]) {
  const segments: { text: string; mention?: Mention }[] = [];
  let offset = 0;
  for (const mention of [...mentions].sort((a, b) => a.start - b.start)) {
    if (
      mention.start < offset ||
      mention.end <= mention.start ||
      body.slice(mention.start, mention.end) !== `@${mention.display_name}`
    )
      continue;
    if (mention.start > offset)
      segments.push({ text: body.slice(offset, mention.start) });
    segments.push({ text: body.slice(mention.start, mention.end), mention });
    offset = mention.end;
  }
  segments.push({ text: body.slice(offset) });
  return segments;
}

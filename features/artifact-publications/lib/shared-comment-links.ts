import type { SharedPublicationLinkTitle } from "@/lib/api/generated/model";
import { sharedPublicationLinkTitlesSharedPublicationsLinkTitlesGet as getTitles } from "@/lib/api/generated/shared-publications/shared-publications";
import { getMentionSegments, type TextMention } from "@/lib/comments/mentions";
import { editorLinks } from "@/lib/smart-links/editor-links";

import { sharedPublicationLinkId } from "@/lib/smart-links/reference";

export async function loadSharedLinkTitles(
  comments: ReadonlyArray<{ body: string; mentions?: TextMention[] }>,
  signal: AbortSignal,
): Promise<SharedPublicationLinkTitle[]> {
  const ids = new Set<string>();
  for (const comment of comments) {
    for (const segment of getMentionSegments(
      comment.body,
      comment.mentions ?? [],
    )) {
      if (segment.mention) continue;
      for (const link of editorLinks(segment.text, true)) {
        const id = sharedPublicationLinkId(link.href, window.location.origin);
        if (id) ids.add(id);
        if (ids.size === 50) break;
      }
      if (ids.size === 50) break;
    }
    if (ids.size === 50) break;
  }
  if (!ids.size) return [];
  try {
    return (await getTitles({ ids: [...ids] }, { signal })).filter(
      (item) => Date.parse(item.expires_at) > Date.now(),
    );
  } catch {
    signal.throwIfAborted();
    return [];
  }
}

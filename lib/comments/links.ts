const urlPattern =
  /(?<![\p{L}\p{N}_:/@])https?:\/\/[^\s<>"'、。！？「」『』【】]+/giu;

const relativeSharedPath =
  /(?<![^\s(（「])\/shared\/publications\/[\da-f-]{36}\/?(?:[?#][^\s<>"'、。！？「」『』【】]+)?(?=$|[\s),.、。！？「」'"<>])/giu;

export function safeCommentLink(text: string): string | null {
  if (!/^https?:\/\//i.test(text) || /[\s\\\p{Cc}]/u.test(text)) return null;
  try {
    const url = new URL(text);
    if (!url.hostname || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function trimLinkPunctuation(text: string) {
  let end = text.replace(/[.,!?;:]+$/, "");
  for (const [open, close] of [
    ["(", ")"],
    ["[", "]"],
  ]) {
    while (
      end.endsWith(close) &&
      end.split(close).length > end.split(open).length
    ) {
      end = end.slice(0, -1);
    }
  }
  return end;
}

export function getCommentLinkSegments(
  text: string,
  includeSharedPaths = false,
) {
  const segments: { text: string; href?: string }[] = [];
  let offset = 0;
  const links = [...text.matchAll(urlPattern)];
  if (includeSharedPaths) {
    links.push(...text.matchAll(relativeSharedPath));
    links.sort((a, b) => a.index - b.index);
  }
  for (const match of links) {
    if (match.index < offset) continue;
    const label = trimLinkPunctuation(match[0]);
    const href = label.startsWith("/") ? label : safeCommentLink(label);
    if (!href) continue;
    if (match.index > offset)
      segments.push({ text: text.slice(offset, match.index) });
    segments.push({ text: label, href });
    offset = match.index + label.length;
  }
  if (offset < text.length) segments.push({ text: text.slice(offset) });
  return segments;
}

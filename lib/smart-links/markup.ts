import { safeCommentLink } from "../comments/links";

export const smartLinkAutoTitle = "syncnesto:inline";
export const smartLinkUrlTitle = "syncnesto:url";
export type LinkDisplay = "auto" | "url" | "label";

export function safeLinkDestination(value: string): string | null {
  const text = value.trim();
  if (
    text.startsWith("/") &&
    !text.startsWith("//") &&
    !/[\\\s<>\p{Cc}]/u.test(text)
  ) {
    return text;
  }
  return safeCommentLink(text);
}

export function makeLinkMarkup(
  href: string,
  label: string,
  display: LinkDisplay,
): string {
  const escape = (text: string) => text.replace(/[\\[\]`*_~<>]/g, "\\$&");
  const text = escape((display === "label" ? label.trim() : "") || href);
  const title =
    display === "url"
      ? ` "${smartLinkUrlTitle}"`
      : display === "auto"
        ? ` "${smartLinkAutoTitle}"`
        : "";
  return `[${text}](<${href}>${title})`;
}

export function linkDisplay(
  title: string | undefined,
  explicit: boolean,
): LinkDisplay {
  if (title === smartLinkUrlTitle) return "url";
  if (title === smartLinkAutoTitle) return "auto";
  return explicit ? "label" : "auto";
}

export function unescapeLinkLabel(label: string): string {
  return label.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^`_{|}~])/g, "$1");
}

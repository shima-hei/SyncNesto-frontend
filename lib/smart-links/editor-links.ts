import { getCommentLinkSegments } from "../comments/links";
import {
  linkDisplay,
  safeLinkDestination,
  unescapeLinkLabel,
  type LinkDisplay,
} from "./markup";

export type EditorLink = {
  start: number;
  end: number;
  text: string;
  href: string;
  display: LinkDisplay;
};

const explicitLink =
  /(?<![\\!])\[((?:\\.|[^\]\\\r\n])*)\]\(\s*(?:<([^<>\r\n]+)>|([^\s<>()]+))(?:\s+"([^"\r\n]*)")?\s*\)/g;
const fencedBlock =
  /^ {0,3}((?:`{3,}|~{3,}))[^\r\n]*\r?\n[\s\S]*?(?:^ {0,3}\1(?:(?<=`)`*|(?<=~)~*)[\x20\t]*(?=\r?$)|(?![\s\S]))/gm;
const inlineCode = /(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g;

export function editorLinks(
  source: string,
  includeSharedPaths = false,
): EditorLink[] {
  const output: EditorLink[] = [];
  const protectedRanges = Array.from(source.matchAll(fencedBlock), (match) => [
    match.index,
    match.index + match[0].length,
  ]);
  let offset = 0;
  for (const [start, end] of [
    ...protectedRanges,
    [source.length, source.length],
  ]) {
    for (const match of source.slice(offset, start).matchAll(inlineCode)) {
      protectedRanges.push([
        offset + match.index,
        offset + match.index + match[0].length,
      ]);
    }
    offset = end;
  }
  const inCode = (position: number) =>
    protectedRanges.some(([start, end]) => position >= start && position < end);
  const addRaw = (offset: number, end: number) => {
    for (const part of getCommentLinkSegments(
      source.slice(offset, end),
      includeSharedPaths,
    )) {
      const start = offset;
      offset += part.text.length;
      if (part.href && !inCode(start)) {
        output.push({
          start,
          end: offset,
          text: part.text,
          href: part.href,
          display: "auto",
        });
      }
    }
  };
  let boundary = 0;
  for (const match of source.matchAll(explicitLink)) {
    const href = safeLinkDestination(match[2] ?? match[3]);
    if (inCode(match.index)) continue;
    addRaw(boundary, match.index);
    boundary = match.index + match[0].length;
    if (href) {
      output.push({
        start: match.index,
        end: boundary,
        text: unescapeLinkLabel(match[1]) || href,
        href,
        display: linkDisplay(match[4], true),
      });
    }
  }
  addRaw(boundary, source.length);
  return output;
}

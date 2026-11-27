const ignored = "img, svg, input, [data-anchor-ignore]";
const blocks = new Set([
  "P",
  "DIV",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "PRE",
  "BLOCKQUOTE",
  "OL",
  "UL",
  "LI",
  "TABLE",
  "TR",
  "TH",
  "TD",
  "BR",
  "HR",
]);
const contextLength = 48;
const maxQuoteLength = 1000;
const maxSourceLength = 150_000;

type Point = { node: Text; start: number; end: number };

export type RenderedQuote = {
  anchor_format: "rendered-text-v1";
  quote: string;
  source_value: string;
  start_offset: number;
  end_offset: number;
  prefix: string;
  suffix: string;
  offset_unit: "unicode_code_point";
};

function projection(root: HTMLElement) {
  const values: string[] = [];
  const points: Array<Point | null> = [];
  const append = (character: string, point: Point | null) => {
    if (/\s/u.test(character)) {
      if (!values.length || values.at(-1) === " ") return;
      character = " ";
    }
    values.push(character);
    points.push(point);
  };
  const visit = (node: Node) => {
    if (node instanceof Text) {
      let offset = 0;
      for (const character of node.data) {
        append(character, {
          node,
          start: offset,
          end: offset + character.length,
        });
        offset += character.length;
      }
    } else if (node instanceof Element && !node.matches(ignored)) {
      const block = blocks.has(node.tagName);
      if (block) append(" ", null);
      Array.from(node.childNodes).forEach(visit);
      if (block) append(" ", null);
    }
  };
  visit(root);
  if (values.at(-1) === " ") {
    values.pop();
    points.pop();
  }
  return { values, points };
}

export function renderedText(root: HTMLElement) {
  return projection(root).values.join("");
}

export function quoteRenderedRange(
  root: HTMLElement,
  selection: Selection | null,
): RenderedQuote | null {
  if (!selection || selection.rangeCount !== 1) return null;
  const range = selection.getRangeAt(0);
  if (
    range.collapsed ||
    !root.contains(range.startContainer) ||
    !root.contains(range.endContainer) ||
    Array.from(root.querySelectorAll("img, [data-anchor-image]")).some((node) =>
      range.intersectsNode(node),
    )
  )
    return null;

  const { values, points } = projection(root);
  if (values.length > maxSourceLength) return null;
  const touched = new Map<Text, boolean>();
  let start = -1;
  let end = -1;
  for (const [index, point] of points.entries()) {
    if (!point || values[index] === " ") continue;
    if (!touched.has(point.node))
      touched.set(point.node, range.intersectsNode(point.node));
    if (
      !touched.get(point.node) ||
      (range.startContainer === point.node &&
        point.start < range.startOffset) ||
      (range.endContainer === point.node && point.end > range.endOffset)
    )
      continue;
    if (start === -1) start = index;
    end = index + 1;
  }
  if (start < 0 || end - start > maxQuoteLength) return null;
  return {
    anchor_format: "rendered-text-v1",
    quote: values.slice(start, end).join(""),
    source_value: values.join(""),
    start_offset: start,
    end_offset: end,
    prefix: values.slice(Math.max(0, start - contextLength), start).join(""),
    suffix: values.slice(end, end + contextLength).join(""),
    offset_unit: "unicode_code_point",
  };
}

function occurrences(source: string, quote: string) {
  const matches: number[] = [];
  if (!quote) return matches;
  let index = source.indexOf(quote);
  while (index >= 0) {
    matches.push(index);
    index = source.indexOf(quote, index + 1);
  }
  return matches;
}

export function resolveRenderedQuote(anchor: RenderedQuote, current: string) {
  const {
    quote,
    source_value: original,
    start_offset,
    end_offset,
    prefix,
    suffix,
  } = anchor;
  const old = Array.from(original);
  const selected = old.slice(start_offset, end_offset).join("");
  if (!quote || selected !== quote) return null;
  if (original === current)
    return { start: start_offset, end: end_offset, moved: false };

  const matches = occurrences(current, quote);
  if (matches.length < occurrences(original, quote).length) return null;
  const uniqueContext = (left: string, right: string) => {
    if (!left && !right) return null;
    const context = left + quote + right;
    if (occurrences(original, context).length !== 1) return null;
    const candidates = occurrences(current, context);
    if (candidates.length !== 1) return null;
    const start = Array.from(
      current.slice(0, candidates[0] + left.length),
    ).length;
    return { start, end: start + end_offset - start_offset, moved: true };
  };
  const fullMatch = uniqueContext(prefix, suffix);
  if (fullMatch) return fullMatch;
  // 編集差分より前後の連続した同一領域だけで、十分な文脈を再照合する。
  const next = Array.from(current);
  const limit = Math.min(old.length, next.length);
  let front = 0;
  while (front < limit && old[front] === next[front]) front++;
  let back = 0;
  while (
    front + back < limit &&
    old[old.length - 1 - back] === next[next.length - 1 - back]
  )
    back++;
  const left = Array.from(prefix);
  const right = Array.from(suffix);
  if (right.length && front - end_offset >= Math.min(8, right.length)) {
    return uniqueContext(prefix, right.slice(0, front - end_offset).join(""));
  }
  const backContext = start_offset - (old.length - back);
  if (left.length && backContext >= Math.min(8, left.length)) {
    return uniqueContext(left.slice(-backContext).join(""), suffix);
  }
  return null;
}

export function renderedQuoteRange(root: HTMLElement, anchor: RenderedQuote) {
  const { values, points } = projection(root);
  const resolved = resolveRenderedQuote(anchor, values.join(""));
  if (!resolved) return null;
  const first = points[resolved.start];
  const last = points[resolved.end - 1];
  if (!first || !last) return null;
  const range = root.ownerDocument.createRange();
  range.setStart(first.node, first.start);
  range.setEnd(last.node, last.end);
  return range;
}

let highlightTimer: number | undefined;

export function showQuoteRange(range: Range) {
  const element = range.startContainer.parentElement;
  element?.scrollIntoView({
    block: "center",
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
  const highlights = globalThis.CSS?.highlights;
  if (!highlights || typeof Highlight === "undefined") {
    const selection = range.startContainer.ownerDocument?.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return;
  }
  highlights.set("document-review-quote", new Highlight(range));
  window.clearTimeout(highlightTimer);
  highlightTimer = window.setTimeout(
    () => highlights.delete("document-review-quote"),
    1800,
  );
}

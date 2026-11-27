type MarkdownNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  position?: { start: { offset?: number }; end: { offset?: number } };
  children?: MarkdownNode[];
};

const attribute = "data-quote-source";

export function rehypeQuoteSourcePositions(source: string) {
  return (tree: MarkdownNode) => {
    const visit = (node: MarkdownNode) => {
      if (node.tagName === "code") return;
      node.children = node.children?.map((child) => {
        const start = child.position?.start.offset;
        const end = child.position?.end.offset;
        if (
          child.type === "text" &&
          start !== undefined &&
          end !== undefined &&
          child.value &&
          source.slice(start, end) === child.value
        ) {
          return {
            type: "element",
            tagName: "span",
            properties: { [attribute]: start },
            children: [child],
          };
        }
        visit(child);
        return child;
      });
    };
    visit(tree);
  };
}

export function quoteMarkdownSource(
  root: HTMLElement,
  source: string,
  selection: Selection | null,
) {
  if (!selection || selection.rangeCount !== 1 || selection.isCollapsed)
    return null;
  const range = selection.getRangeAt(0);
  const start = range.startContainer;
  const end = range.endContainer;
  if (
    !(start instanceof Text) ||
    !(end instanceof Text) ||
    !root.contains(start) ||
    !root.contains(end)
  )
    return null;
  const startOffset = start.parentElement?.getAttribute(attribute);
  const endOffset = end.parentElement?.getAttribute(attribute);
  if (startOffset == null || endOffset == null) return null;
  if (
    Array.from(root.querySelectorAll("img, [data-anchor-image]")).some(
      (image) => range.intersectsNode(image),
    )
  )
    return null;
  const offset = Number(startOffset) + range.startOffset;
  const raw = source.slice(offset, Number(endOffset) + range.endOffset);
  const quote = raw.trim();
  if (!quote || raw !== range.toString() || Array.from(quote).length > 1000)
    return null;
  return {
    quote,
    quote_start: Array.from(
      source.slice(0, offset + raw.length - raw.trimStart().length),
    ).length,
  };
}

export function fixedQuoteRange(
  root: HTMLElement,
  source: string,
  quote: string,
  quoteStart: number | null,
) {
  if (!quote || quoteStart == null || quoteStart < 0) return null;
  const start = Array.from(source).slice(0, quoteStart).join("").length;
  if (!source.startsWith(quote, start)) return null;
  const end = start + quote.length;
  let first: { text: Text; offset: number } | undefined;
  let last: { text: Text; offset: number } | undefined;
  for (const element of root.querySelectorAll(`[${attribute}]`)) {
    const text = element.firstChild;
    if (!(text instanceof Text)) continue;
    const offset = Number(element.getAttribute(attribute));
    const stop = offset + text.length;
    if (offset <= start && start < stop)
      first = { text, offset: start - offset };
    if (offset < end && end <= stop) last = { text, offset: end - offset };
  }
  if (!first || !last) return null;
  const range = root.ownerDocument.createRange();
  range.setStart(first.text, first.offset);
  range.setEnd(last.text, last.offset);
  return range.toString() === quote ? range : null;
}

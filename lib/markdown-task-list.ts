type MarkdownNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  position?: { start: { offset?: number } };
  children?: MarkdownNode[];
};

/** Locate only the marker belonging to a parsed GFM task item. */
export function getMarkdownTaskOffset(value: string, start?: number) {
  if (start === undefined) return null;
  const marker = /^(?:[-+*]|\d+[.)])[\t ]+\[[ xX]\](?=[\t \r\n]|$)/.exec(
    value.slice(start),
  );
  return marker ? start + marker[0].indexOf("[") + 1 : null;
}

export function setMarkdownTaskChecked(
  value: string,
  offset: number,
  checked: boolean,
) {
  if (
    !Number.isInteger(offset) ||
    offset < 1 ||
    !/^\[[ xX]\]$/.test(value.slice(offset - 1, offset + 2))
  ) {
    return value;
  }
  return `${value.slice(0, offset)}${checked ? "x" : " "}${value.slice(offset + 1)}`;
}

/** Carry source offsets to the generated checkbox, without reprinting Markdown. */
export function rehypeMarkdownTaskPositions({ value }: { value: string }) {
  return (tree: MarkdownNode) => {
    const visit = (node: MarkdownNode) => {
      if (node.tagName === "li") {
        const first = node.children?.find((child) => child.type === "element");
        const checkbox = first?.tagName === "p" ? first.children?.[0] : first;
        const offset = getMarkdownTaskOffset(
          value,
          node.position?.start.offset,
        );
        if (
          offset !== null &&
          checkbox?.tagName === "input" &&
          checkbox.properties?.type === "checkbox"
        ) {
          checkbox.properties["data-task-offset"] = offset;
          checkbox.properties["data-task-label"] = value
            .slice(offset + 2)
            .split(/\r?\n/, 1)[0]
            .trim();
        }
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}

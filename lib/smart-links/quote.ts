export function selectedTextForLinkSource(
  container: HTMLElement | null,
  original: string,
  selection = window.getSelection(),
): string | undefined {
  if (
    !container ||
    !selection?.rangeCount ||
    selection.isCollapsed ||
    !selection.anchorNode ||
    !selection.focusNode ||
    !container.contains(selection.anchorNode) ||
    !container.contains(selection.focusNode)
  ) {
    return undefined;
  }
  const selected = selection.toString().trim();
  if (selected && original.includes(selected)) return selected;

  const anchor =
    selection.anchorNode.parentElement?.closest<HTMLElement>(
      "[data-link-source]",
    );
  if (
    anchor &&
    container.contains(anchor) &&
    anchor.contains(selection.focusNode)
  ) {
    const source = anchor.dataset.linkSource;
    if (source && original.includes(source)) return source;
  }
  const copy = selection.getRangeAt(0).cloneContents();
  for (const link of copy.querySelectorAll<HTMLElement>("[data-link-source]")) {
    link.replaceWith(link.dataset.linkSource ?? link.textContent ?? "");
  }
  const restored = copy.textContent?.trim();
  return restored && original.includes(restored) ? restored : undefined;
}

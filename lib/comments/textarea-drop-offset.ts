// 設定によってフォームコントロール内の位置を公開しないブラウザーがある。
export function textareaDropOffset(
  editor: HTMLTextAreaElement,
  x: number,
  y: number,
) {
  const doc = editor.ownerDocument;
  const rect = editor.getBoundingClientRect();
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom)
    return null;
  const direct = doc.caretPositionFromPoint?.(x, y);
  if (direct?.offsetNode === editor) return direct.offset;

  const styles = getComputedStyle(editor);
  const mirror = doc.createElement("div");
  const text = doc.createTextNode(editor.value + "\u200b");
  mirror.append(text);
  Object.assign(mirror.style, {
    position: "fixed",
    zIndex: "2147483647",
    opacity: "0",
    pointerEvents: "auto",
    overflow: "hidden",
    boxSizing: "border-box",
    left: `${rect.left + editor.clientLeft}px`,
    top: `${rect.top + editor.clientTop}px`,
    width: `${editor.clientWidth}px`,
    height: `${editor.clientHeight}px`,
    padding: styles.padding,
    font: styles.font,
    lineHeight: styles.lineHeight,
    letterSpacing: styles.letterSpacing,
    textAlign: styles.textAlign,
    direction: styles.direction,
    tabSize: styles.tabSize,
    whiteSpace: editor.wrap === "off" ? "pre" : "pre-wrap",
    overflowWrap: editor.wrap === "off" ? "normal" : "break-word",
  });
  doc.body.append(mirror);
  try {
    mirror.scrollTop = editor.scrollTop;
    mirror.scrollLeft = editor.scrollLeft;
    const caret = doc.caretPositionFromPoint?.(x, y);
    if (caret?.offsetNode === text)
      return Math.min(caret.offset, editor.value.length);
    const range = doc.caretRangeFromPoint?.(x, y);
    return range?.startContainer === text
      ? Math.min(range.startOffset, editor.value.length)
      : null;
  } finally {
    mirror.remove();
  }
}

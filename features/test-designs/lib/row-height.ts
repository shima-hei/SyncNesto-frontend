/** 改行・折り返しを含む本文の表示高さ。手動指定値は最小高さとして扱う。 */
export function textHeight(value: string, width: number) {
  const capacity = Math.max(1, Math.floor((width - 16) / 8));
  const lines = value.split("\n").reduce((total, line) => {
    const length = Array.from(line).reduce(
      (n, char) => n + (char.charCodeAt(0) > 255 ? 2 : 1),
      0,
    );
    return total + Math.max(1, Math.ceil(length / capacity));
  }, 0);
  return Math.max(36, lines * 20 + 12);
}

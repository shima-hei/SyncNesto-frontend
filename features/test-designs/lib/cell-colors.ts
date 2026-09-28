import type { CellStyle } from "@/lib/api/generated/model";

export function getContrastingHexColor(value: string): string | undefined {
  const match = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!match) return undefined;
  const hex =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((c) => c + c)
          .join("")
      : match[1];
  const channels = [0, 2, 4].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
    ? "#000000"
    : "#ffffff";
}

export function getCellColors(style?: CellStyle) {
  // 片方だけ明示された書式も、テーマを切り替えて読めるように補完する。
  return {
    background:
      style?.background ??
      (style?.color ? getContrastingHexColor(style.color) : undefined),
    color:
      style?.color ??
      (style?.background
        ? getContrastingHexColor(style.background)
        : undefined),
  };
}

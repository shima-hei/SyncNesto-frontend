import type { CellStyle } from "@/lib/api/generated/model";

export type ClipboardCell = { value: string; style?: CellStyle };

export function parseTsv(text: string): string[][] {
  const rows: string[][] = [[]];
  let cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && (quoted || !cell)) {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === "\t" || c === "\n" || c === "\r")) {
      rows[rows.length - 1].push(cell);
      cell = "";
      if (c !== "\t") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        rows.push([]);
      }
    } else cell += c;
  }
  rows[rows.length - 1].push(cell);
  if (rows.length > 1 && rows.at(-1)?.length === 1 && rows.at(-1)?.[0] === "")
    rows.pop();
  return rows;
}

export function toTsv(rows: ClipboardCell[][]) {
  return rows
    .map((row) =>
      row
        .map(({ value }) =>
          /[\t\r\n"]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value,
        )
        .join("\t"),
    )
    .join("\n");
}

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export function toHtml(rows: ClipboardCell[][]) {
  return `<table>${rows.map((row) => `<tr>${row.map(({ value, style: s }) => `<td style="font-weight:${s?.bold ? "bold" : "normal"};text-align:${s?.align ?? "left"};${s?.background ? `background-color:${s.background};` : ""}${s?.color ? `color:${s.color};` : ""}">${escapeHtml(value).replaceAll("\n", "<br>")}</td>`).join("")}</tr>`).join("")}</table>`;
}

function colorHex(value: string): string | undefined {
  if (!value || value === "transparent") return undefined;
  if (/^#[a-f\d]{6}$/i.test(value)) return value;
  if (/^#[a-f\d]{3}$/i.test(value))
    return (
      "#" +
      value
        .slice(1)
        .split("")
        .map((c) => c + c)
        .join("")
    );
  const match = value.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/);
  if (!match) {
    const context = document.createElement("canvas").getContext("2d");
    if (!context || !CSS.supports("color", value)) return undefined;
    context.fillStyle = value;
    return /^#[a-f\d]{6}$/i.test(context.fillStyle)
      ? context.fillStyle
      : undefined;
  }
  return match
    ? "#" +
        match
          .slice(1)
          .map((c) => Math.min(255, Number(c)).toString(16).padStart(2, "0"))
          .join("")
    : undefined;
}

export function readClipboard(data: DataTransfer): ClipboardCell[][] {
  const html = data.getData("text/html");
  if (html && html.length < 5_000_000) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const css = new CSSStyleSheet();
    css.replaceSync(
      Array.from(doc.querySelectorAll("style"))
        .map((s) => s.textContent)
        .join("\n"),
    );
    const rules = Array.from(css.cssRules).filter(
      (r): r is CSSStyleRule => r instanceof CSSStyleRule,
    );
    // HTMLやCSSを画面に挿入せず、許可した書式の値だけを取り出す。
    const properties = [
      "font-weight",
      "text-align",
      "background-color",
      "color",
    ];
    const readStyle = (cell: HTMLElement) => {
      const target = doc.createElement("span").style;
      const nodes: HTMLElement[] = [];
      let parent: HTMLElement | null = cell;
      while (parent) {
        nodes.unshift(parent);
        parent = parent.parentElement;
      }
      const child = cell.querySelector<HTMLElement>("span,font,b,strong");
      if (child) nodes.push(child);
      for (const node of nodes) {
        for (const rule of rules) {
          try {
            if (node.matches(rule.selectorText))
              for (const key of properties) {
                const value = rule.style.getPropertyValue(key);
                if (value) target.setProperty(key, value);
              }
          } catch {
            /* Excel独自のセレクタは無視する。 */
          }
        }
        for (const key of properties) {
          const value = node.style.getPropertyValue(key);
          if (value) target.setProperty(key, value);
        }
        if (node.getAttribute("color"))
          target.color = node.getAttribute("color")!;
        if (node.getAttribute("bgcolor"))
          target.backgroundColor = node.getAttribute("bgcolor")!;
        if (node.getAttribute("align"))
          target.textAlign = node.getAttribute("align")!;
      }
      return target;
    };
    const rows = Array.from(doc.querySelectorAll("table tr"));
    if (rows.length)
      return rows.map((row) =>
        Array.from(row.querySelectorAll("td,th")).map((node) => {
          const cell = node as HTMLElement;
          cell.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
          const style = readStyle(cell);
          const align = ["left", "center", "right"].includes(style.textAlign)
            ? (style.textAlign as CellStyle["align"])
            : "left";
          return {
            value: cell.textContent ?? "",
            style: {
              bold:
                style.fontWeight === "bold" ||
                Number(style.fontWeight) >= 600 ||
                Boolean(cell.querySelector("b,strong")),
              align,
              background: colorHex(style.backgroundColor),
              color: colorHex(style.color),
            },
          };
        }),
      );
  }
  return parseTsv(data.getData("text/plain")).map((r) =>
    r.map((value) => ({ value })),
  );
}

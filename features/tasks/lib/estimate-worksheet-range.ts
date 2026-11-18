import type { SheetField } from "./estimate-worksheet";

export type CellAddress = { id: number; field: SheetField };
export function bounds(
  rows: number[],
  fields: readonly SheetField[],
  anchor: CellAddress,
  end: CellAddress,
) {
  const a = rows.indexOf(anchor.id),
    b = rows.indexOf(end.id),
    c = fields.indexOf(anchor.field),
    d = fields.indexOf(end.field);
  return Math.min(a, b, c, d) < 0
    ? null
    : {
        top: Math.min(a, b),
        bottom: Math.max(a, b),
        left: Math.min(c, d),
        right: Math.max(c, d),
      };
}
// Reference names may contain tabs, quotes and line breaks when copied from a spreadsheet.
export function toTsv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map((v) =>
          /["\r\n\t]/.test(v) ? '"' + v.replaceAll('"', '""') + '"' : v,
        )
        .join("\t"),
    )
    .join("\n");
}
export function fromTsv(source: string): string[][] {
  const text = source.replace(/\r\n?/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted && ch === '"' && text[i + 1] === '"') {
      cell += '"';
      i++;
      continue;
    }
    if (ch === '"' && (quoted || !cell)) {
      quoted = !quoted;
      continue;
    }
    if (!quoted && (ch === "\t" || ch === "\n")) {
      row.push(cell);
      cell = "";
      if (ch === "\n") {
        rows.push(row);
        row = [];
      }
    } else cell += ch;
  }
  if (quoted) throw new Error("貼り付け内容の引用符を確認してください。");
  if (cell || row.length || !rows.length || !text.endsWith("\n")) {
    row.push(cell);
    rows.push(row);
  }
  if (rows.some((r) => r.length !== rows[0].length))
    throw new Error("列数が揃った範囲を貼り付けてください。");
  return rows;
}

import { parseTsv, toTsv } from "@/features/test-designs/lib/clipboard";
import type {
  ScreenListEdit,
  ScreenListGroup,
  ScreenListMember,
  ScreenListRow,
} from "@/lib/api/generated/model";
import { screenKinds } from "./workspace";

const fields = {
  title: "画面名",
  screen_kind: "画面種別",
  route: "URL・識別子",
  group_ids: "機能グループ",
  assignee_id: "担当者",
} as const;
type Editable = keyof typeof fields;
const editable = Object.keys(fields) as Editable[];
const headers = new Map<string, Editable>(
  editable.map((key) => [fields[key], key]),
);
const idHeader = "画面ID";
const ignoredHeaders = new Set([
  "関連要件",
  "関連API",
  "レビュー・承認状態",
  "更新日時",
]);
const MAX_ROWS = 100;
const MAX_TEXT = 150_000;

export function copyScreenList(
  rows: ScreenListRow[],
  serializeStatus: (row: ScreenListRow) => string,
  formatUpdated: (row: ScreenListRow) => string,
) {
  const table = [
    [idHeader, ...Object.values(fields), ...ignoredHeaders],
    ...rows.map((row) => [
      `SCR-${String(row.id).padStart(4, "0")}`,
      row.title,
      screenKinds[row.screen_kind],
      row.route,
      row.groups.map((group) => group.name).join("、"),
      row.assignee?.name ?? "",
      row.related_requirements.map((item) => item.code).join("、"),
      row.related_apis.map((item) => item.code).join("、"),
      serializeStatus(row),
      formatUpdated(row),
    ]),
  ];
  return toTsv(
    table.map((row) =>
      row.map((value) => ({
        value: /^[=+@-]/.test(value) ? `'${value}` : value,
      })),
    ),
  );
}

type ClipboardOptions = {
  mode: "create" | "update";
  visibleRows: ScreenListRow[];
  selection: ScreenListRow[];
  members: ScreenListMember[];
  groups: ScreenListGroup[];
  defaultGroup?: string;
};

export function readScreenListPaste(text: string, options: ClipboardOptions) {
  const edits: ScreenListEdit[] = [];
  const errors: string[] = [];
  if (!text.trim()) return { edits, errors };
  if (text.length > MAX_TEXT)
    return { edits, errors: ["貼り付ける内容が大きすぎます。"] };
  const rows = parseTsv(text);
  const first = rows[0].map((name) => name.trim().replace(/^\uFEFF/, ""));
  const hasHeader =
    first.includes(idHeader) ||
    first.includes(fields.title) ||
    (first.length > 1 &&
      first.every((value) => headers.has(value) || ignoredHeaders.has(value)));
  const order = hasHeader ? first.map((label) => headers.get(label)) : editable;
  const idColumn = hasHeader ? first.indexOf(idHeader) : -1;
  const body = (hasHeader ? rows.slice(1) : rows).filter((row) =>
    row.some((cell) => cell.trim()),
  );
  if (body.length > MAX_ROWS)
    return { edits, errors: ["一度に貼り付けられるのは100行までです。"] };
  const targets = new Map(options.visibleRows.map((row) => [row.id, row]));
  const seen = new Set<number>();
  const types = new Map(
    (
      Object.entries(screenKinds) as [ScreenListRow["screen_kind"], string][]
    ).flatMap(([key, label]) => [
      [key, key],
      [label, key],
    ]),
  );
  for (const [index, row] of body.entries()) {
    const line = index + 1 + Number(hasHeader);
    const fail = (message: string) => errors.push(`${line}行目 · ${message}`);
    const data: ScreenListEdit = {};
    if (options.mode === "update") {
      const idText = idColumn < 0 ? "" : row[idColumn]?.trim();
      const id = idText?.match(/^(?:SCR-)?(\d+)$/i)?.[1];
      const target =
        idColumn < 0 ? options.selection[index] : id && targets.get(Number(id));
      if (!target || seen.has(target.id)) {
        fail("対象の画面を現在の一覧で確認してください。");
        continue;
      }
      seen.add(target.id);
      data.id = target.id;
      data.version = target.version;
    } else if (options.defaultGroup) {
      data.group_ids = [options.defaultGroup];
    }
    row.forEach((raw, column) => {
      const value = raw.trim().replace(/^'(?=[=+@-])/, "");
      switch (order[column]) {
        case "title":
          if (!value || value.length > 200)
            fail("画面名を200文字以内で入力してください。");
          else data.title = value;
          break;
        case "route":
          if (value.length > 1000)
            fail("URL・識別子は1000文字以内にしてください。");
          else data.route = value;
          break;
        case "screen_kind": {
          const kind = types.get(value);
          if (value && !kind) fail("画面種別を確認してください。");
          else if (kind) data.screen_kind = kind;
          break;
        }
        case "group_ids": {
          const ids = value
            ? value
                .split(/[、,]/)
                .map((name) =>
                  options.groups.filter((group) => group.name === name.trim()),
                )
            : [];
          if (ids.some((matches) => matches.length !== 1))
            fail("機能グループ名を確認してください。");
          else data.group_ids = ids.map(([match]) => match.id);
          break;
        }
        case "assignee_id": {
          const matches = options.members.filter(
            (member) => member.name === value,
          );
          if (value && matches.length !== 1)
            fail("担当者名を確認してください。");
          else data.assignee_id = value ? matches[0].id : null;
          break;
        }
      }
    });
    if (options.mode === "create" && !data.title)
      fail("新しい画面名が必要です。");
    if (options.mode === "update" && Object.keys(data).length === 2)
      fail("更新する列を指定してください。");
    edits.push(data);
  }
  return { edits, errors };
}

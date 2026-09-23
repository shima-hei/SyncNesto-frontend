import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const directory = path.dirname(fileURLToPath(import.meta.url));

// 既存のTypeScriptコンパイラで純粋関数だけを読み込み、ブラウザ依存を持ち込まない。
const cache = new Map();
function load(file) {
  file = path.resolve(directory, "..", file);
  if (cache.has(file)) return cache.get(file);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loaded = { exports: {} };
  const requireLocal = (name) =>
    load(path.resolve(path.dirname(file), name + ".ts"));
  new Function("require", "module", "exports", source)(
    requireLocal,
    loaded,
    loaded.exports,
  );
  cache.set(file, loaded.exports);
  return loaded.exports;
}
const clipboard = load("features/test-designs/lib/clipboard.ts");
const domain = load("features/test-designs/lib/design.ts");
const sheets = load("features/test-designs/lib/sheets.ts");
const matrix = load("features/test-designs/lib/matrix.ts");
const tables = load("features/test-designs/lib/pattern-tables.ts");
const caseDiff = load("features/test-designs/lib/case-diff.ts");
const { textHeight } = load("features/test-designs/lib/row-height.ts");

test("設計変更は既存の差分処理で変更フィールドだけを表示する", () => {
  const before = {
    item: {
      code: "T001",
      content: "ログインできること",
      steps: "ログインボタンを押す",
      expected_result: "トップ画面が表示される",
      custom_values: { priority: "高" },
    },
    pattern_table: { id: "table-1", name: "ログインパターン" },
    pattern: { code: "P001" },
    values: [
      { factor_id: "factor-1", factor: "ユーザー種別", level: "管理者" },
    ],
    expected_values: [{ id: "expected-1", name: "成功" }],
    columns: { priority: "優先度" },
  };
  const after = structuredClone(before);
  after.item.steps = "必要項目を入力し、ログインボタンを押す";
  after.item.expected_result = "ダッシュボードが表示される";
  after.pattern_table.name = "認証パターン";
  after.pattern.description = "境界値";
  after.values[0].level = "一般ユーザー";
  after.expected_values[0].name = "ログイン成功";
  after.expected_values.push({ id: "expected-2", name: "監査ログを記録" });
  const rows = caseDiff.getCaseDesignDiff(before, after);
  assert.deepEqual(
    rows.map((row) => row.label),
    [
      "操作・実行手順",
      "期待結果",
      "パターン表",
      "組み合わせ",
      "ユーザー種別",
      "パターンの期待値",
    ],
  );
  assert.equal(rows[0].oldValue, "ログインボタンを押す");
  assert.equal(rows[0].newValue, "必要項目を入力し、ログインボタンを押す");
  assert.equal(rows.at(-1).newValue, "ログイン成功\n監査ログを記録");
  assert.deepEqual(caseDiff.getCaseDesignDiff(before, before), []);
});

test("実施順の列を保持しケース数列を表示しない。改行と折り返しで行高を広げる", () => {
  assert.deepEqual(
    sheets
      .gridData(empty(), "items")
      .columns.slice(0, 9)
      .map((c) => c.key),
    [
      "code",
      "target_feature",
      "viewpoint",
      "content",
      "preconditions",
      "steps",
      "test_data",
      "expected_result",
      "pattern_table_id",
    ],
  );
  assert.ok(
    !sheets
      .gridData(empty(), "items")
      .columns.some((c) => c.key === "case_count"),
  );
  assert.equal(textHeight("a\nb\nc", 180), 72);
  assert.ok(textHeight("長い日本語の操作手順を記入します", 80) > 36);
});

test("明示的な区切り行を保存対象として挿入し、ケース数から除外する", () => {
  const design = empty();
  sheets.editCells(
    design,
    "items",
    [{ row: 0, key: "content", value: "先頭" }],
    1,
  );
  sheets.editCells(
    design,
    "items",
    [{ row: 1, key: "content", value: "末尾" }],
    2,
  );
  domain.insertItem(design, design.items[1].id, true);
  assert.equal(design.items.length, 3);
  assert.equal(design.items[1].is_spacer, true);
  assert.equal(sheets.gridData(design, "items").rows[1].spacer, true);
  assert.equal(
    [...tables.caseCounts(design).values()].reduce((a, b) => a + b, 0),
    2,
  );
  sheets.editCells(
    design,
    "items",
    [{ row: 1, key: "content", value: "新しい項目" }],
    3,
  );
  assert.equal(design.items[1].is_spacer, false);
  assert.match(design.items[1].code, /^T\d{3}$/);
});

test("途中への挿入・削除後は区切り行を除いて項目IDを行順に振り直す", () => {
  const design = empty();
  sheets.editCells(
    design,
    "items",
    [0, 1, 2].map((row) => ({ row, key: "content", value: `項目${row}` })),
    3,
  );
  const stableIds = design.items.map((item) => item.id);
  domain.insertItem(design, stableIds[1], false);
  assert.deepEqual(
    design.items.map((item) => item.code),
    ["T001", "T002", "T003", "T004"],
  );
  assert.deepEqual(
    [design.items[0].id, design.items[2].id, design.items[3].id],
    stableIds,
  );
  const insertedId = design.items[1].id;
  domain.insertItem(design, stableIds[2], true);
  assert.equal(design.items[3].is_spacer, true);
  assert.deepEqual(
    design.items.filter((item) => !item.is_spacer).map((item) => item.code),
    ["T001", "T002", "T003", "T004"],
  );
  sheets.deleteRows(design, "items", [insertedId]);
  assert.deepEqual(
    design.items.filter((item) => !item.is_spacer).map((item) => item.code),
    ["T001", "T002", "T003"],
  );
  assert.deepEqual(
    design.items.map((item) => item.position),
    [0, 1, 2, 3],
  );
});

test("保存済みの旧い飛び番は読込時に整え、元データを変更しない", () => {
  const design = empty();
  design.items = ["T001", "T004", "T002"].map((code, position) => ({
    id: `item-${position}`,
    code,
    position,
    custom_values: {},
  }));
  const ordered = domain.withOrderedItemCodes(design);
  assert.deepEqual(
    ordered.items.map((item) => item.code),
    ["T001", "T002", "T003"],
  );
  assert.deepEqual(
    design.items.map((item) => item.code),
    ["T001", "T004", "T002"],
  );
  assert.equal(domain.withOrderedItemCodes(ordered), ordered);
});
function empty() {
  return {
    id: 1,
    project_id: 1,
    name: "設計",
    version: 1,
    items: [],
    factors: [],
    levels: [],
    patterns: [],
    values: [],
    links: [],
    columns: [],
    layout: {},
  };
}

test("複数期待値の貼り付け・個別解除・複製を保持する", () => {
  const d = empty();
  d.patterns = [{ id: "p", code: "P001" }];
  d.expected_values = [
    { id: "a", name: "成功" },
    { id: "b", name: "記録" },
  ];
  matrix.editMatrix(d, [
    { row: 4, key: "p", value: "●" },
    { row: 5, key: "p", value: "○" },
  ]);
  assert.equal(d.expected_selections.length, 2);
  assert.equal(matrix.matrixRows(d)[5].values.p, "●");
  const copy = matrix.duplicatePattern(d, "p");
  assert.equal(d.patterns.find((p) => p.id === copy).code, "P002");
  assert.equal(
    d.expected_selections.filter((v) => v.pattern_id === copy).length,
    2,
  );
  matrix.editMatrix(d, [{ row: 4, key: "p", value: "" }]);
  assert.deepEqual(
    d.expected_selections
      .filter((v) => v.pattern_id === "p")
      .map((v) => v.expected_value_id),
    ["b"],
  );
});

test("末尾の空入力を保存せず貼り付け中の空行も除外する", () => {
  const d = empty();
  sheets.editCells(d, "items", [{ row: 0, key: "content", value: "" }], 1);
  assert.equal(d.items.length, 0);
  sheets.editCells(
    d,
    "items",
    [
      { row: 0, key: "content", value: "一件目" },
      { row: 1, key: "content", value: "" },
      { row: 2, key: "content", value: "二件目" },
    ],
    3,
  );
  assert.deepEqual(
    d.items.map((i) => i.content),
    ["一件目", "二件目"],
  );
});

test("マトリクスの排他選択・期待値・複製を独立データとして保持する", () => {
  const d = empty();
  d.factors = [{ id: "f", name: "因子" }];
  d.levels = [
    { id: "a", factor_id: "f", name: "A" },
    { id: "b", factor_id: "f", name: "B" },
  ];
  d.patterns = [{ id: "p", code: "P001" }];
  d.expected_values = [{ id: "e", name: "成功" }];
  matrix.editMatrix(d, [
    { row: 4, key: "p", value: "○" },
    { row: 5, key: "p", value: "○" },
    { row: 6, key: "p", value: "○" },
  ]);
  assert.equal(d.values.length, 1);
  assert.equal(d.values[0].level_id, "b");
  assert.equal(d.expected_selections[0].expected_value_id, "e");
  const copy = matrix.duplicatePattern(d, "p");
  assert.equal(
    d.expected_selections.find((v) => v.pattern_id === copy).expected_value_id,
    "e",
  );
  assert.equal(d.links.length, 0);
  matrix.removeMatrixRows(d, ["b", "expected:e"]);
  assert.ok(d.values.every((v) => v.level_id === null));
  assert.equal(d.expected_selections.length, 0);
});

test("ID列が空の貼り付けでも新規項目は自動採番する", () => {
  const d = empty();
  sheets.editCells(
    d,
    "items",
    [
      { row: 0, key: "code", value: "" },
      { row: 0, key: "content", value: "確認" },
    ],
    1,
  );
  assert.equal(d.items[0].code, "T001");
});

test("1万水準と1万パターンでも空の交点を生成しない", () => {
  const d = empty();
  d.factors = [{ id: "f", name: "因子" }];
  d.levels = Array.from({ length: 10000 }, (_, i) => ({
    id: `l${i}`,
    factor_id: "f",
    name: `水準${i}`,
  }));
  d.patterns = Array.from({ length: 10000 }, (_, i) => ({
    id: `p${i}`,
    code: `P${i}`,
  }));
  d.values = d.patterns.map((p, i) => ({
    id: `v${i}`,
    pattern_id: p.id,
    factor_id: "f",
    level_id: `l${i}`,
  }));
  const rows = matrix.matrixRows(d);
  assert.equal(rows.length, 10004);
  assert.ok(rows.reduce((n, r) => n + Object.keys(r.values).length, 0) < 80000);
});

test("用途別の表を分離し、表なしは1ケースとして計算する", () => {
  const d = empty();
  sheets.editCells(
    d,
    "items",
    [
      { row: 0, key: "content", value: "ログイン" },
      { row: 1, key: "content", value: "タイトル" },
    ],
    2,
  );
  const a = tables.createPatternTable(d, d.items[0].id);
  const b = tables.createPatternTable(d);
  tables.editPatternTable(d, a, (v) => {
    sheets.addRow(v, "factors");
    sheets.addRow(v, "patterns");
    sheets.addRow(v, "patterns");
  });
  tables.editPatternTable(d, b, (v) => {
    sheets.addRow(v, "factors");
    sheets.addRow(v, "patterns");
  });
  assert.equal(tables.tableDesign(d, a).patterns.length, 2);
  assert.equal(tables.tableDesign(d, b).patterns.length, 1);
  assert.equal(tables.caseCount(d, d.items[0].id), 2);
  assert.equal(tables.caseCount(d, d.items[1].id), 1);
  tables.deletePatternTable(d, a);
  assert.equal(tables.caseCount(d, d.items[0].id), 1);
  assert.equal(d.patterns.length, 1);
  assert.equal(d.patterns[0].table_id, b);
});

test("TSVは改行・タブ・引用符・末尾の空セルを往復できる", () => {
  const values = [
    ["改行\nあり", "タブ\tあり", '"引用"', ""],
    ["", "日本語", "x", ""],
  ];
  assert.deepEqual(
    clipboard.parseTsv(
      clipboard.toTsv(values.map((r) => r.map((value) => ({ value })))),
    ),
    values,
  );
  assert.deepEqual(clipboard.parseTsv("a\tb\r\nc\td\r\n"), [
    ["a", "b"],
    ["c", "d"],
  ]);
});

test("書式付きHTMLでセル本文をHTMLとして実行しない", () => {
  const html = clipboard.toHtml([
    [
      {
        value: '<script>alert("x")</script>',
        style: { bold: true, background: "#ffffff" },
      },
    ],
  ]);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("font-weight:bold"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("全組み合わせの生成は既存の無効パターンも重複追加しない", () => {
  const d = empty();
  d.factors = [
    { id: "f1", name: "ユーザー" },
    { id: "f2", name: "状態" },
  ];
  d.levels = [
    { id: "a", factor_id: "f1", name: "管理者" },
    { id: "b", factor_id: "f1", name: "一般" },
    { id: "c", factor_id: "f2", name: "あり" },
    { id: "d", factor_id: "f2", name: "なし" },
  ];
  domain.generatePatterns(d);
  assert.equal(d.patterns.length, 4);
  assert.equal(d.values.length, 8);
  d.patterns[0].enabled = false;
  domain.generatePatterns(d);
  assert.equal(d.patterns.length, 4);
  assert.equal(d.patterns[0].enabled, false);
});

test("一括貼り付けは行を追加し、書式を安定IDに紐づける", () => {
  const d = empty();
  sheets.editCells(
    d,
    "items",
    [
      { row: 0, key: "content", value: "ログイン", style: { bold: true } },
      { row: 1, key: "content", value: "ログアウト" },
    ],
    2,
  );
  assert.equal(d.items.length, 2);
  assert.equal(d.items[1].content, "ログアウト");
  assert.equal(d.layout.cells[`items:${d.items[0].id}:content`].bold, true);
  sheets.deleteRows(d, "items", [d.items[1].id]);
  assert.equal(d.layout.cells[`items:${d.items[0].id}:content`].bold, true);
});

test("別因子の水準を拒否し、水準削除時は対象外へ切り替える", () => {
  const d = empty();
  d.factors = [
    { id: "f1", name: "A" },
    { id: "f2", name: "B" },
  ];
  d.levels = [{ id: "l", factor_id: "f2", name: "B水準" }];
  d.patterns = [{ id: "p", code: "P001" }];
  assert.throws(() =>
    sheets.editCells(d, "patterns", [{ row: 0, key: "f1", value: "B水準" }], 1),
  );
  sheets.editCells(d, "patterns", [{ row: 0, key: "f2", value: "B水準" }], 1);
  sheets.deleteRows(d, "levels", ["l"]);
  assert.equal(d.values[0].level_id, null);
});

test("多対多のリンクは元項目・パターン削除時に整理する", () => {
  const d = empty();
  sheets.addRow(d, "items");
  sheets.addRow(d, "items");
  sheets.addRow(d, "patterns");
  sheets.addRow(d, "patterns");
  for (let i = 0; i < 4; i++) sheets.addRow(d, "links");
  assert.equal(d.links.length, 4);
  sheets.deleteRows(d, "patterns", [d.patterns[0].id]);
  assert.equal(d.links.length, 2);
  sheets.deleteRows(d, "items", [d.items[0].id]);
  assert.equal(d.links.length, 1);
});

test("10,000行を一括追加して一意なIDとコードを保持する", () => {
  const d = empty();
  const edits = Array.from({ length: 10000 }, (_, row) => ({
    row,
    key: "content",
    value: `項目${row + 1}`,
  }));
  sheets.editCells(d, "items", edits, 10000);
  assert.equal(d.items.length, 10000);
  assert.equal(new Set(d.items.map((i) => i.id)).size, 10000);
  assert.equal(new Set(d.items.map((i) => i.code)).size, 10000);
  assert.equal(d.items[9999].content, "項目10000");
});

test("生成上限まで登録済みでも再生成は重複しない", () => {
  const d = empty();
  d.factors = [{ id: "f", name: "因子" }];
  d.levels = Array.from({ length: 10000 }, (_, i) => ({
    id: `l${i}`,
    factor_id: "f",
    name: `水準${i}`,
  }));
  domain.generatePatterns(d);
  domain.generatePatterns(d);
  assert.equal(d.patterns.length, 10000);
  assert.equal(d.values.length, 10000);
});

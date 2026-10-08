import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(
  new URL("./pattern-comments.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
});
const {
  commentCounts,
  commentMatchesTarget,
  commentScopeKey,
  commentTargetKey,
  createMatrixCommentTarget,
  matrixCommentFocus,
  patternCommentIndex,
} = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const design = {
  pattern_tables: [
    { id: "table-a", name: "ログイン" },
    { id: "table-b", name: "権限" },
  ],
  factors: [
    { id: "factor-a", table_id: "table-a", name: "ユーザー" },
    { id: "factor-b", table_id: "table-b", name: "権限" },
  ],
  levels: [
    { id: "level-a", factor_id: "factor-a", name: "管理者" },
    { id: "level-b", factor_id: "factor-a", name: "一般" },
  ],
  expected_values: [{ id: "expected-a", table_id: "table-a", name: "成功" }],
  patterns: [{ id: "pattern-a", table_id: "table-a", code: "P001" }],
  values: [
    { pattern_id: "pattern-a", factor_id: "factor-a", level_id: "level-b" },
  ],
};

test("表・因子・水準・期待値・組み合わせを同じ表に集計し、別表を混ぜない", () => {
  const index = patternCommentIndex(design);
  assert.equal(index.tables.get("factor_level:level-a"), "table-a");
  assert.equal(index.tables.get("combination:pattern-a"), "table-a");
  assert.equal(index.tables.get("expected_value:expected-a"), "table-a");
  assert.equal(index.tables.get("factor:factor-b"), "table-b");
  assert.equal(index.tables.get("factor_level:deleted-level"), undefined);
});
test("水準セルと因子セルを区別し、未選択の水準セルも個別に指定する", () => {
  const target = createMatrixCommentTarget(design);
  assert.equal(target("level-a", "factor").target.target_type, "factor");
  assert.equal(target("level-a", "level").target.target_type, "factor_level");
  assert.deepEqual(target("level-a", "pattern-a").target, {
    target_type: "combination",
    target_id: "pattern-a",
    field: "level:factor-a:level-a",
  });
  assert.equal(
    target("level-b", "pattern-a").target.field,
    "level:factor-a:level-b",
  );
  assert.equal(
    target("expected:expected-a", "pattern-a").target.field,
    "expected:expected-a",
  );
});
test("コメントから現在選択されている水準と正しい組み合わせ列に戻る", () => {
  assert.deepEqual(
    matrixCommentFocus(design, {
      target_type: "combination",
      target_id: "pattern-a",
      field: "level:factor-a:level-a",
    }),
    { rowId: "level-a", columnKey: "pattern-a" },
  );
  assert.equal(
    matrixCommentFocus(design, {
      target_type: "combination",
      target_id: "pattern-a",
      field: "level:factor-b:level-a",
    }),
    null,
  );
  assert.deepEqual(
    matrixCommentFocus(design, {
      target_type: "combination",
      target_id: "pattern-a",
      field: "level:factor-a",
    }),
    { rowId: "level-b", columnKey: "pattern-a" },
  );
  assert.deepEqual(
    matrixCommentFocus(design, {
      target_type: "factor_level",
      target_id: "level-a",
      field: "name",
    }),
    { rowId: "level-a", columnKey: "level" },
  );
  assert.deepEqual(
    matrixCommentFocus(design, {
      target_type: "expected_value",
      target_id: "expected-a",
      field: "name",
    }),
    { rowId: "expected:expected-a", columnKey: "level" },
  );
});
test("水準未選択・水準なしの因子でも因子行を開ける", () => {
  const empty = { ...design, values: [], levels: [] };
  assert.deepEqual(
    matrixCommentFocus(empty, {
      target_type: "combination",
      target_id: "pattern-a",
      field: "level:factor-a",
    }),
    { rowId: "factor:factor-a", columnKey: "pattern-a" },
  );
  assert.equal(
    createMatrixCommentTarget(empty)("factor:factor-a", "factor").label,
    "因子 · ユーザー",
  );
});
test("削除された対象を先頭セルへ誤ってフォーカスしない", () => {
  assert.equal(
    matrixCommentFocus(design, {
      target_type: "factor_level",
      target_id: "deleted-level",
      field: "name",
    }),
    null,
  );
  assert.equal(
    matrixCommentFocus(design, {
      target_type: "combination",
      target_id: "pattern-a",
      field: "expected:deleted-expected",
    }),
    null,
  );
  assert.equal(
    matrixCommentFocus(design, {
      target_type: "combination",
      target_id: "pattern-a",
      field: "level:deleted-factor",
    }),
    null,
  );
});
test("対象のフィールドごとに返信を含めて数え、削除本文は印の件数に含めない", () => {
  const comment = {
    target_type: "combination",
    target_id: "pattern-a",
    field: "level:factor-a",
    deleted_at: null,
  };
  const counts = commentCounts([
    comment,
    { ...comment, is_resolved: true },
    { ...comment, deleted_at: "2026-09-29" },
    { ...comment, field: "notes" },
  ]);
  assert.equal(counts.get(commentTargetKey(comment)), 2);
  assert.equal(counts.get("combination:pattern-a:notes"), 1);
  assert.equal(commentScopeKey(comment), "combination:pattern-a");
  const legacy = commentCounts([comment], design);
  assert.equal(legacy.get("combination:pattern-a:level:factor-a:level-a"), 1);
  assert.equal(legacy.get("combination:pattern-a:level:factor-a:level-b"), 1);
  assert.equal(
    commentMatchesTarget(comment, {
      ...comment,
      field: "level:factor-a:level-a",
    }),
    true,
  );
  assert.equal(
    commentMatchesTarget(
      { ...comment, field: "level:factor-a:level-a" },
      { ...comment, field: "level:factor-a:level-b" },
    ),
    false,
  );
});

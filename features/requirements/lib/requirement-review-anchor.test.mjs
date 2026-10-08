import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const { outputText } = ts.transpileModule(
  readFileSync(
    new URL("./requirement-review-anchor.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  },
);
const { evaluateRequirementReviewAnchor } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

const anchor = {
  scope: "section_requirements_review",
  source_view: "requirement_document_overview_tab",
  field: "description",
  quote: "対象\n本文",
  quote_start: 2,
  offset_unit: "unicode_code_point",
  target_version: 3,
};

test("MCPの引用位置は絵文字と改行を含む元の文字列で判定する", () => {
  assert.equal(
    evaluateRequirementReviewAnchor(anchor, "😀 対象\n本文", 3),
    "current",
  );
  assert.equal(
    evaluateRequirementReviewAnchor(anchor, "😀 対象\n本文", 4),
    "changed",
  );
});

test("引用が移動・削除された指摘を有効な位置として扱わない", () => {
  assert.equal(
    evaluateRequirementReviewAnchor(anchor, "追記😀 対象\n本文", 4),
    "moved",
  );
  assert.equal(
    evaluateRequirementReviewAnchor(anchor, "😀 別の本文", 4),
    "missing",
  );
});

test("既存UIのUTF-16・空白正規化された引用も維持する", () => {
  assert.equal(
    evaluateRequirementReviewAnchor(
      {
        scope: anchor.scope,
        source_view: anchor.source_view,
        field: "description",
        quote: "対象 本文",
        start_offset: 3,
        end_offset: 8,
        requirement_version: 3,
      },
      "😀 対象\n本文",
      3,
    ),
    "current",
  );
});

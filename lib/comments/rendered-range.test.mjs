import assert from "node:assert/strict";
import test from "node:test";
import { resolveRenderedQuote } from "./rendered-range.ts";

const source =
  "最初😀 同じ文 最初の説明。第二 同じ文 更新時の説明。第三 同じ文 削除時の説明。";
const quote = "同じ文";
const before = "最初😀 同じ文 最初の説明。第二 ";
const start = Array.from(before).length;
const anchor = {
  anchor_format: "rendered-text-v1",
  offset_unit: "unicode_code_point",
  quote,
  source_value: source,
  start_offset: start,
  end_offset: start + quote.length,
  prefix: before,
  suffix: " 更新時の説明。第三 同じ文 削除時の説明。",
};

test("keeps the actual second occurrence with code-point coordinates", () => {
  assert.deepEqual(resolveRenderedQuote(anchor, source), {
    start,
    end: start + quote.length,
    moved: false,
  });
  assert.deepEqual(resolveRenderedQuote(anchor, "追記 " + source), {
    start: start + 3,
    end: start + 3 + quote.length,
    moved: true,
  });
  assert.deepEqual(
    resolveRenderedQuote(anchor, source.replace("最初😀 ", "短 ")),
    {
      start: start - 2,
      end: start - 2 + quote.length,
      moved: true,
    },
  );
});

test("never adopts a surviving duplicate after the original is deleted", () => {
  assert.equal(
    resolveRenderedQuote(
      anchor,
      source.replace("第二 同じ文 更新時の説明。", ""),
    ),
    null,
  );
  assert.equal(resolveRenderedQuote(anchor, source + " " + source), null);
  assert.equal(
    resolveRenderedQuote(
      anchor,
      source.replace("更新時の説明", "変更後の説明"),
    ),
    null,
  );
});

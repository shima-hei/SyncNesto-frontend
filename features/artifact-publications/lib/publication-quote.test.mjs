import assert from "node:assert/strict";
import test from "node:test";
import { quoteFromTextarea } from "./publication-quote.ts";

test("textarea の改行正規化後も固定本文のコードポイント位置を保持する", () => {
  const source = "😀A\r\n後半";
  const value = "😀A\n後半";
  assert.deepEqual(
    quoteFromTextarea("description", source, {
      value,
      selectionStart: value.indexOf("後半"),
      selectionEnd: value.length,
    }),
    { field: "description", quote: "後半", quote_start: 4 },
  );
});

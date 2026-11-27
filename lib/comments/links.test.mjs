import assert from "node:assert/strict";
import test from "node:test";
import { getCommentLinkSegments, safeCommentLink } from "./links.ts";

test("relative fixed-publication paths preserve navigation and are opt-in", () => {
  const href =
    "/shared/publications/ea5ac41f-4a48-47c8-8452-f990ffb78ac8#shared-comments";
  const text = `確認 (${href})`;
  assert.deepEqual(getCommentLinkSegments(text), [{ text }]);
  assert.deepEqual(getCommentLinkSegments(text, true), [
    { text: "確認 (" },
    { text: href, href },
    { text: ")" },
  ]);
});

test("links retain surrounding punctuation and visible text", () => {
  const body =
    "仕様 (https://example.com/check(a))、結果: https://example.com/report。";
  const segments = getCommentLinkSegments(body);
  assert.deepEqual(
    segments.filter((item) => item.href).map((item) => item.href),
    ["https://example.com/check(a)", "https://example.com/report"],
  );
  assert.equal(segments.map((item) => item.text).join(""), body);
});

test("script schemes, rewritten hosts, credentials and embedded schemes stay plain", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,script",
    "//example.com",
    "https://user@example.com",
    "https://example.com\\wrong",
    "https://\nexample.com",
  ]) {
    assert.equal(safeCommentLink(value), null);
  }
  for (const body of [
    "javascript:https://example.com",
    "<script>alert(1)</script>",
    "data:https://example.com",
  ]) {
    assert.deepEqual(getCommentLinkSegments(body), [{ text: body }]);
  }
});

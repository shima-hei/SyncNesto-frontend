import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const source = ts.transpileModule(
  readFileSync(
    new URL("../lib/markdown-task-list.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const { rehypeMarkdownTaskPositions, setMarkdownTaskChecked } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const offsets = (value) => {
  const html = renderToStaticMarkup(
    React.createElement(
      ReactMarkdown,
      {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [[rehypeMarkdownTaskPositions, { value }]],
      },
      value,
    ),
  );
  return [...html.matchAll(/data-task-offset="(\d+)"/g)].map((m) =>
    Number(m[1]),
  );
};

test("GFM source offsets preserve Unicode, nested/quoted/ordered and loose task items", () => {
  const value =
    "😀 日本語\r\n\r\n- [ ] 同じ項目\r\n  - [X] 子\r\n\r\n- [x] 同じ項目\r\n\r\n> 1. [ ] 引用\r\n";
  const positions = offsets(value);
  assert.equal(positions.length, 4);
  for (const offset of positions) {
    const checked = value[offset] === " ";
    const updated = setMarkdownTaskChecked(value, offset, checked);
    assert.equal(updated.slice(0, offset), value.slice(0, offset));
    assert.equal(updated.slice(offset + 1), value.slice(offset + 1));
    assert.equal(updated[offset], checked ? "x" : " ");
  }
});

test("code examples and literal brackets are never editable tasks", () => {
  const value =
    "```md\n- [ ] example\n```\n\n`- [ ] inline`\n\n- 普通の [ ] 文章\n\n- [ ] 実際の項目\n";
  const positions = offsets(value);
  assert.equal(positions.length, 1);
  assert.equal(positions[0], value.lastIndexOf("[ ]") + 1);
});

test("missing, invalid and stale marker positions keep the original text", () => {
  for (const offset of [-1, 0, 1.5, 999, Number.NaN])
    assert.equal(setMarkdownTaskChecked("本文", offset, true), "本文");
  assert.equal(setMarkdownTaskChecked("[a]", 1, true), "[a]");
});

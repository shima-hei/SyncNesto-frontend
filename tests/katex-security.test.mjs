import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

// Mermaidが実際に解決するKaTeXを確認し、別バージョンでの誤検証を防ぐ。
const require = createRequire(import.meta.resolve("mermaid"));
const katex = require("katex");

test("MermaidのKaTeXは分数とMathMLを引き続き描画できる", () => {
  const html = katex.renderToString(String.raw`\frac{x^2+1}{2}`, {
    throwOnError: true,
  });
  assert.match(html, /class="katex"/);
  assert.match(html, /<math /);
  assert.match(html, /<mfrac>/);
});

test("prototype経由のtrustでは危険な数式リンクを許可しない", () => {
  const descriptor = Object.getOwnPropertyDescriptor(Object.prototype, "trust");
  try {
    Object.defineProperty(Object.prototype, "trust", {
      value: true,
      configurable: true,
      writable: true,
    });
    const html = katex.renderToString(
      String.raw`\href{javascript:alert(1)}{demo}`,
      { throwOnError: false },
    );
    assert.doesNotMatch(html, /<a\b|\bhref=/);
  } finally {
    if (descriptor)
      Object.defineProperty(Object.prototype, "trust", descriptor);
    else delete Object.prototype.trust;
  }
});

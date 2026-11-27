import assert from "node:assert/strict";
import test from "node:test";
import {
  bodyImageId,
  imageMarkdown,
  pendingBodyImages,
  pendingImageMarkdown,
} from "./markdown-body-images.ts";

const id = "835af593-9b4f-43b2-a820-ab7a4dfa6239";

test("persists only the exact body image reference and escapes filename Markdown", () => {
  const url = `/api/body-images/${id}`;
  assert.equal(bodyImageId(url), id);
  assert.equal(bodyImageId(url + "?expires=1"), undefined);
  assert.equal(bodyImageId("https://example.com" + url), undefined);
  assert.equal(
    imageMarkdown("日本語 [写真]\n次の行", url),
    `![日本語 \\[写真\\] 次の行](${url})`,
  );
});

test("keeps insertion placeholders separate from persisted URLs", () => {
  const marker = pendingImageMarkdown(id);
  assert.deepEqual(pendingBodyImages(`前${marker}後`), [{ id, marker }]);
  assert.equal(bodyImageId(`/api/body-images/pending/${id}`), undefined);
});

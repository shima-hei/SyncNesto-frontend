import assert from "node:assert/strict";
import test from "node:test";
import {
  getMentionQuery,
  getMentionSegments,
  reconcileMentions,
} from "./mentions.ts";

const mention = { user_id: 7, display_name: "田中 太郎", start: 3, end: 9 };
const body = "😀 @田中 太郎 さん\n田中 太郎さんの対応";

test("metadata marks only selected occurrences, including duplicate names", () => {
  const segments = getMentionSegments(body, [mention]);
  assert.equal(segments.filter((segment) => segment.mention).length, 1);
  assert.equal(segments.map((segment) => segment.text).join(""), body);
  const repeated = body + "\n@田中 太郎";
  const second = { ...mention, start: body.length + 1, end: repeated.length };
  assert.equal(
    getMentionSegments(repeated, [mention, second]).filter(
      (segment) => segment.mention,
    ).length,
    2,
  );
  assert.equal(
    getMentionSegments("@田中 太郎", []).some((segment) => segment.mention),
    false,
  );
});

test("typing, filtering and email boundaries", () => {
  assert.deepEqual(getMentionQuery("@", 1, []), {
    start: 0,
    end: 1,
    query: "",
  });
  assert.deepEqual(getMentionQuery("確認 @ta", 6, []), {
    start: 3,
    end: 6,
    query: "ta",
  });
  assert.equal(getMentionQuery("name@example.com", 16, []), null);
  assert.equal(getMentionQuery(body, mention.end, [mention]), null);
  assert.equal(getMentionQuery(body, mention.start + 2, [mention]), null);
});

test("edits before and after mentions preserve their identity and UTF-16 offsets", () => {
  assert.deepEqual(reconcileMentions(body, "先頭 " + body, [mention]), [
    { ...mention, start: 6, end: 12 },
  ]);
  assert.deepEqual(reconcileMentions(body, body + "!", [mention]), [mention]);
  assert.deepEqual(reconcileMentions(body, body.slice(3), [mention]), [
    { ...mention, start: 0, end: 6 },
  ]);
  assert.deepEqual(
    reconcileMentions(body, "😀 x" + body.slice(3), [mention], {
      start: 3,
      end: 3,
    }),
    [{ ...mention, start: 4, end: 10 }],
  );
});

test("editing or deleting a selected mention removes its relation", () => {
  assert.deepEqual(
    reconcileMentions(body, body.replace("@田中", "@佐藤"), [mention]),
    [],
  );
  assert.deepEqual(
    reconcileMentions(body, body.slice(0, 3) + body.slice(9), [mention], {
      start: 3,
      end: 9,
    }),
    [],
  );
  assert.deepEqual(
    reconcileMentions(body, body.slice(0, 5) + "X" + body.slice(5), [mention], {
      start: 5,
      end: 5,
    }),
    [],
  );
  assert.deepEqual(reconcileMentions(body, "", [mention]), []);
});

test("deleting one adjacent identical mention keeps the occurrence that survived", () => {
  const token = "@田中 太郎";
  const first = { ...mention, start: 0, end: token.length };
  const second = {
    ...mention,
    user_id: 8,
    start: token.length,
    end: token.length * 2,
  };
  assert.deepEqual(
    reconcileMentions(token + token, token, [first, second], {
      start: 0,
      end: token.length,
    }),
    [{ ...first, user_id: 8 }],
  );
  assert.deepEqual(
    reconcileMentions(token + token, token, [first, second], {
      start: token.length,
      end: token.length * 2,
    }),
    [first],
  );
});

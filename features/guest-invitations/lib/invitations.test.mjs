import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const { outputText } = ts.transpileModule(
  readFileSync(new URL("./invitations.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
);
const {
  invitationTokenFromHash,
  invitationStateLabel,
  deliveryStateLabel,
  invitationActorLabel,
} = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("氏名の欠けた本人の記録を配送処理と表示しない", () => {
  assert.equal(
    invitationActorLabel({ actor_name: null, actor_kind: "user" }),
    "氏名を確認できない利用者",
  );
  assert.equal(
    invitationActorLabel({ actor_name: "  ", actor_kind: "email_recipient" }),
    "招待メールの確認者",
  );
  assert.equal(
    invitationActorLabel({ actor_name: null, actor_kind: "delivery" }),
    "配送処理",
  );
  assert.equal(
    invitationActorLabel({ actor_name: "佐藤さん", actor_kind: "user" }),
    "佐藤さん",
  );
});

test("メールfragmentの正確な形式だけを確認する", () => {
  const token = "A".repeat(43);
  assert.equal(invitationTokenFromHash(`#token=${token}`), token);
  for (const value of [
    "",
    "#token=short",
    `#token=${token}&next=//evil.test`,
    `#token=${token}%0a`,
    `#token=${token}&token=${token}`,
  ])
    assert.equal(invitationTokenFromHash(value), undefined);
});

test("配送受付と参加完了を混同しない", () => {
  assert.equal(invitationStateLabel("pending"), "返答待ち");
  assert.equal(deliveryStateLabel("sent"), "送信受付済み");
  assert.equal(deliveryStateLabel("unknown"), "送信結果を確認できません");
  assert.equal(invitationStateLabel("accepted"), "参加済み");
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const code = ts.transpileModule(
  readFileSync(
    new URL("./standard-creation-store.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const { createStandardCreationStore } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
const attempt = {
  schemaVersion: 1,
  values: { title: "送信した文書", documentCode: "DOC-A" },
  data: {
    title: "送信した文書",
    document_code: "DOC-A",
    request_key: "98568e0b-90ec-4f56-8976-4a3b3ef1a411",
    template_version: "standard_v1",
  },
};
function setup() {
  let raw = null,
    current = true,
    removals = 0;
  return {
    adapter: {
      read: () => raw,
      write: (value) => {
        raw = value;
      },
      remove: () => {
        raw = null;
        removals++;
      },
      isCurrent: () => current,
    },
    get raw() {
      return raw;
    },
    get removals() {
      return removals;
    },
    setRaw: (value) => {
      raw = value;
    },
    switchScope: () => {
      current = false;
    },
  };
}
test("結果不明の送信を再表示しても同じkeyとpayloadを保ち、差し替えを拒否", () => {
  const fixture = setup(),
    store = createStandardCreationStore(fixture.adapter);
  store.save(attempt);
  const reload = createStandardCreationStore(fixture.adapter);
  assert.deepEqual(reload.read(), attempt);
  assert.throws(() => {
    reload.read().data.title = "編集";
  }, TypeError);
  assert.throws(() =>
    reload.save({ ...attempt, data: { ...attempt.data, title: "別の内容" } }),
  );
  assert.throws(() =>
    reload.save({
      ...attempt,
      data: {
        ...attempt.data,
        request_key: "558ad6a3-7671-4bde-b66f-033795276d4a",
      },
    }),
  );
  assert.deepEqual(reload.read(), attempt);
});
test("保存失敗・不正な保存情報は新しい送信へ置き換えず、自動削除しない", () => {
  const fixture = setup();
  const blocked = createStandardCreationStore({
    ...fixture.adapter,
    write: () => {
      throw Error("quota");
    },
  });
  assert.throws(() => blocked.save(attempt));
  assert.equal(fixture.raw, null);
  fixture.setRaw("broken-json");
  const store = createStandardCreationStore(fixture.adapter);
  assert.throws(() => store.read());
  assert.throws(() => store.save(attempt));
  assert.equal(fixture.raw, "broken-json");
  assert.equal(fixture.removals, 0);
});
test("組織等の変更と別の送信への遅い完了では記録を消さない", () => {
  const fixture = setup(),
    store = createStandardCreationStore(fixture.adapter);
  store.save(attempt);
  store.clear("558ad6a3-7671-4bde-b66f-033795276d4a");
  assert.equal(fixture.removals, 0);
  fixture.switchScope();
  assert.throws(() => store.clear(attempt.data.request_key));
  assert.equal(fixture.removals, 0);
});
test("外部状態のsnapshotは変更がない間安定し、保存と完了を通知", () => {
  const fixture = setup(),
    store = createStandardCreationStore(fixture.adapter);
  let changes = 0;
  const unsubscribe = store.subscribe(() => changes++);
  const before = store.getSnapshot();
  assert.equal(store.getSnapshot(), before);
  store.save(attempt);
  const pending = store.getSnapshot();
  assert.notEqual(pending, before);
  assert.equal(store.getSnapshot(), pending);
  store.clear(attempt.data.request_key);
  assert.equal(store.getSnapshot().attempt, null);
  assert.equal(changes, 2);
  unsubscribe();
});

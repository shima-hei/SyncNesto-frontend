import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const loaded = {};
function load(file) {
  if (loaded[file]) return loaded[file];
  const mod = { exports: {} };
  const code = ts.transpileModule(
    readFileSync(new URL(file, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  new Function("module", "exports", "require", code)(mod, mod.exports, (name) =>
    load(`${name}.ts`),
  );
  loaded[file] = mod.exports;
  return mod.exports;
}
const { createTaskOrigin, readTaskOrigin, taskOriginHref, withTaskOrigin } =
  load("./task-origin.ts");
const list =
  "/projects/joined/7/tasks?tab=board&q=入力&status=in_progress&page=3";
const origin = createTaskOrigin(7, 51, list);
const params = (href) =>
  new URL(href, "https://syncnesto.invalid").searchParams;

test("Task→REQ→設計→Task→一覧で同じIDと表示・検索・状態・ページを保持", () => {
  const requirement = withTaskOrigin(
    "/projects/joined/7/requirements/11/items/21?tab=relations#designs",
    origin,
  );
  const reqOrigin = readTaskOrigin(params(requirement), 7);
  const specification = withTaskOrigin(
    "/projects/joined/7/specifications/31?tab=links",
    reqOrigin,
  );
  const specOrigin = readTaskOrigin(params(specification), 7);
  const task = withTaskOrigin("/projects/joined/7/tasks/51", specOrigin);
  assert.equal(
    new URL(task, "https://syncnesto.invalid").pathname,
    "/projects/joined/7/tasks/51",
  );
  const restored = new URL(
    params(task).get("returnTo"),
    "https://syncnesto.invalid",
  );
  assert.equal(restored.searchParams.get("tab"), "board");
  assert.equal(restored.searchParams.get("q"), "入力");
  assert.equal(restored.searchParams.get("status"), "in_progress");
  assert.equal(restored.searchParams.get("page"), "3");
  assert.equal(params(requirement).get("tab"), "relations");
  assert.equal(
    new URL(requirement, "https://syncnesto.invalid").hash,
    "#designs",
  );
  assert.equal(task, taskOriginHref(origin));
});

test("不正ID・欠損・別案件の起点は表示しない", () => {
  for (const task of [
    "",
    "0",
    "-1",
    "1e3",
    "1.2",
    "01",
    "2147483648",
    "<script>",
  ]) {
    assert.equal(
      readTaskOrigin(
        new URLSearchParams({ originProject: "7", originTask: task }),
        7,
      ),
      null,
    );
  }
  assert.equal(
    readTaskOrigin(
      params(withTaskOrigin("/projects/joined/7/specifications/31", origin)),
      8,
    ),
    null,
  );
  assert.equal(
    readTaskOrigin(new URLSearchParams({ originTask: "51" }), 7),
    null,
  );
});

test("復帰先を同じ案件のTask一覧に限定し、外部URLや入れ子を除く", () => {
  for (const bad of [
    "https://evil.test/",
    "//evil.test/",
    "javascript:alert(1)",
    "/projects/joined/8/tasks?tab=gantt",
    "/projects/joined/7/tasks/3",
    "/projects/joined/7/trash",
  ]) {
    assert.equal(
      createTaskOrigin(7, 51, bad).listReturn,
      "/projects/joined/7/tasks?tab=list",
    );
  }
  const clean = createTaskOrigin(
    7,
    51,
    "/projects/joined/7/tasks?tab=gantt&returnTo=bad&originProject=9&originTask=4&originList=bad",
  );
  assert.equal(clean.listReturn, "/projects/joined/7/tasks?tab=gantt");
  assert.equal(
    readTaskOrigin(
      new URLSearchParams({
        originProject: "7",
        originTask: "51",
        originList: "x".repeat(4097),
      }),
      7,
    ).listReturn,
    "/projects/joined/7/tasks?tab=list",
  );
});

test("起点は対応する関連詳細だけに伝播し、他案件・外部・別Taskへ伝播しない", () => {
  for (const href of [
    "https://evil.test/projects/joined/7/specifications/1",
    "/projects/joined/8/specifications/31",
    "/projects/joined/70/specifications/31",
    "/projects/joined/7/tasks/52",
    "/projects/joined/7/requirements",
    "/projects/joined/7/specifications/new",
    "/projects/joined/7/documents/4",
  ]) {
    assert.equal(withTaskOrigin(href, origin), href);
  }
  assert.equal(
    withTaskOrigin("/projects/joined/7/specifications/31", null),
    "/projects/joined/7/specifications/31",
  );
});

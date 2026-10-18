import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
function load(file) {
  const mod = { exports: {} };
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function("module", "exports", "require", code)(mod, mod.exports, (name) =>
    load(
      name.startsWith("@/")
        ? resolve(root, `${name.slice(2)}.ts`)
        : resolve(dirname(file), `${name}.ts`),
    ),
  );
  return mod.exports;
}
const {
  joinedProjectNavigationItems: items,
  joinedProjectNavigationGroups: groups,
  getJoinedProjectId,
  isJoinedProjectNavigationActive: active,
} = load(
  resolve(root, "features/projects/constants/joined-project-navigation.ts"),
);

test("既存9入口を保持し、同じ論理分類へ合意・承認を追加する", () => {
  const paths = items.map((item) => item.href(7));
  assert.equal(paths.length, 10);
  for (const suffix of [
    "",
    "/members",
    "/requirements",
    "/tasks",
    "/specifications",
    "/test-designs",
    "/test-cases",
    "/documents",
    "/trash",
    "/fixed-approvals",
  ])
    assert.ok(paths.includes(`/projects/joined/7${suffix}`));
  assert.equal(groups.length, 7);
  assert.equal(
    items.filter((item) => item.group === "どう確かめるか").length,
    2,
  );
  assert.equal(items.filter((item) => item.group === "管理・その他").length, 2);
});

test("既存canShowを維持し、Projectロールなしはsystem_adminでも業務メニューを出さない", () => {
  for (const role of [null, { role: null, is_system_admin: true }])
    assert.equal(items.filter((item) => item.canShow(role)).length, 0);
  for (const key of ["project_admin", "manager", "member", "viewer"]) {
    const visible = items.filter((item) =>
      item.canShow({ role: { key }, is_system_admin: false }),
    );
    assert.equal(visible.length, key === "viewer" ? 9 : 10);
  }
});

test("深いURLの現在地を判定し、概要・別案件・類似prefixを誤選択しない", () => {
  assert.equal(getJoinedProjectId("/projects/joined/7/tasks/51"), 7);
  for (const path of [
    "/projects/joined",
    "/projects/management/7",
    "/projects/joined/7bad/tasks",
  ])
    assert.equal(getJoinedProjectId(path), null);
  assert.ok(
    active("/projects/joined/7/tasks/51", "/projects/joined/7/tasks", 7),
  );
  assert.equal(
    active("/projects/joined/7/tasks/51", "/projects/joined/7", 7),
    false,
  );
  assert.equal(
    active("/projects/joined/7/tasks-other", "/projects/joined/7/tasks", 7),
    false,
  );
});

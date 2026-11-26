import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createRequire } from "node:module";
import ts from "typescript";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const require = createRequire(import.meta.url);
function load(file) {
  const mod = { exports: {} };
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function("module", "exports", "require", code)(
    mod,
    mod.exports,
    (name) =>
      name === "lucide-react"
        ? require(name)
        : load(
            name.startsWith("@/")
              ? resolve(root, `${name.slice(2)}.ts`)
              : resolve(dirname(file), `${name}.ts`),
          ),
  );
  return mod.exports;
}
const {
  defaultProjectNavigation,
  getJoinedProjectId,
  getProjectSection,
  getProjectSectionHref,
  isJoinedProjectNavigationActive: active,
  projectNavigationSections,
} = load(
  resolve(root, "features/projects/constants/joined-project-navigation.ts"),
);

test("既存URLを案件の水平ナビに分類し、深いURLも同じ現在地とする", () => {
  assert.deepEqual(
    defaultProjectNavigation.items.map(({ key }) => key),
    [
      "overview",
      "requirements",
      "design",
      "tasks",
      "planning",
      "tests",
      "documents",
    ],
  );
  for (const [path, key] of [
    ["", "overview"],
    ["/requirements/12", "requirements"],
    ["/fixed-approvals/4", "requirements"],
    [
      "/requirement-workflow/19f781b1-b76d-4042-a9cd-ffc1d4c1122c",
      "requirements",
    ],
    ["/specifications", "design"],
    ["/tasks/51", "tasks"],
    ["/planning", "planning"],
    ["/test-designs/10", "tests"],
    ["/test-cases", "tests"],
    ["/documents", "documents"],
  ])
    assert.equal(getProjectSection(`/projects/joined/7${path}`, 7), key);
  assert.equal(getProjectSection("/projects/joined/7/members", 7), undefined);
  assert.equal(getProjectSection("/projects/joined/8/tasks", 7), undefined);
});

test("選択済みの初期画面は親ナビに適用し、直接URLの分類は変わらない", () => {
  const [requirements, tests] = ["requirements", "tests"].map((key) =>
    projectNavigationSections.find((entry) => entry.key === key),
  );
  const custom = {
    ...defaultProjectNavigation,
    requirements_view: "fixed-approvals",
    tests_view: "test-cases",
  };
  assert.equal(
    getProjectSectionHref(7, requirements, defaultProjectNavigation),
    "/projects/joined/7/requirements",
  );
  assert.equal(
    getProjectSectionHref(7, requirements, custom),
    "/projects/joined/7/fixed-approvals",
  );
  assert.equal(
    getProjectSectionHref(7, tests, custom),
    "/projects/joined/7/test-cases",
  );
  assert.equal(
    getProjectSection("/projects/joined/7/test-designs", 7),
    "tests",
  );
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

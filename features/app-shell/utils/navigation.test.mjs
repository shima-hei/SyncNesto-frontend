import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const cache = new Map();
function load(path) {
  if (cache.has(path)) return cache.get(path);
  const loadedModule = { exports: {} };
  cache.set(path, loadedModule.exports);
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const require = (specifier) => {
    if (specifier === "lucide-react")
      return Object.fromEntries(
        [
          "HomeIcon",
          "FolderKanbanIcon",
          "SettingsIcon",
          "UsersIcon",
          "CircleHelpIcon",
        ].map((icon) => [icon, () => null]),
      );
    const target = specifier.startsWith("@/")
      ? resolve(root, specifier.slice(2))
      : resolve(dirname(path), specifier);
    return load(`${target}.ts`);
  };
  vm.runInNewContext(code, {
    module: loadedModule,
    exports: loadedModule.exports,
    require,
  });
  return loadedModule.exports;
}

const { mainNavigation, managementNavigation } = load(
  resolve(root, "features/app-shell/constants/navigation.ts"),
);
const { getVisibleNavigationItems, isNavigationItemActive } = load(
  resolve(root, "features/app-shell/utils/navigation.ts"),
);
const { getBreadcrumbItems } = load(
  resolve(root, "features/app-shell/utils/breadcrumbs.ts"),
);

test("daily navigation is direct and keeps existing routes", () => {
  assert.equal(
    mainNavigation.map((item) => `${item.title}:${item.href}`).join(","),
    "ホーム:/,プロジェクト:/projects/joined",
  );
  assert.equal(
    mainNavigation.some((item) => item.children?.length),
    false,
  );
  assert.equal(
    isNavigationItemActive(mainNavigation[1], "/projects/joined/7/tasks/12"),
    true,
  );
  assert.equal(
    isNavigationItemActive(mainNavigation[1], "/projects/management"),
    false,
  );
});

test("project roles do not expose system management navigation", () => {
  for (const key of ["member", "manager", "project_admin", "viewer"]) {
    assert.equal(
      getVisibleNavigationItems(managementNavigation, {
        system_roles: [{ key }],
      }).length,
      0,
    );
  }
  assert.equal(getVisibleNavigationItems(managementNavigation, null).length, 0);
});

test("system admin sees both existing management destinations", () => {
  const items = getVisibleNavigationItems(managementNavigation, {
    system_roles: [{ key: "system_admin" }],
  });
  assert.equal(
    items.map((item) => `${item.title}:${item.href}`).join(","),
    "プロジェクト管理:/projects/management,ユーザー管理:/system/users",
  );
});

test("breadcrumbs use daily and management labels without duplicate project hierarchy", () => {
  assert.equal(
    getBreadcrumbItems("/projects/joined")
      .map((item) => item.label)
      .join(","),
    "プロジェクト",
  );
  const detail = getBreadcrumbItems("/projects/joined/7/tasks/12");
  assert.equal(detail[0].href, "/projects/joined");
  assert.equal(detail[1].dynamicId, 7);
  assert.equal(
    getBreadcrumbItems("/projects/management")
      .map((item) => item.label)
      .join(","),
    "管理,プロジェクト管理",
  );
  assert.equal(
    getBreadcrumbItems("/system/users")
      .map((item) => item.label)
      .join(","),
    "管理,ユーザー管理",
  );
});

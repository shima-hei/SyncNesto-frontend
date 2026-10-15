import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";

const nodeRequire = createRequire(import.meta.url);
const source = ts.transpileModule(
  readFileSync(
    new URL(
      "../features/app-shell/components/user/sidebar-scope-menu-item.tsx",
      import.meta.url,
    ),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  },
).outputText;

function render({
  scope = "system",
  admin = true,
  pending = 0,
  ...state
} = {}) {
  const user = { id: 7, demo: undefined };
  let queryOptions;
  const result = {
    data: [],
    isPending: false,
    isFetching: false,
    isError: false,
    ...state,
  };
  const loaded = { exports: {} };
  const dependencies = {
    "react/jsx-runtime": nodeRequire("react/jsx-runtime"),
    "@tanstack/react-query": {
      useIsMutating: () => pending,
      useQuery: (options) => {
        queryOptions = options;
        return result;
      },
    },
    "lucide-react": { Building2Icon: () => null, ShieldCheckIcon: () => null },
    "@/components/ui/dropdown-menu": { DropdownMenuItem: "button" },
    "@/features/auth/providers/auth-provider": { useAuth: () => ({ user }) },
    "@/features/auth/utils/authorization": { isSystemAdmin: () => admin },
    "@/lib/api/generated/tenants/tenants": {
      listMyTenantsTenantsGet: () => [],
    },
  };
  new Function("require", "module", "exports", source)(
    (name) => {
      assert.ok(name in dependencies, name);
      return dependencies[name];
    },
    loaded,
    loaded.exports,
  );
  const element = loaded.exports.SidebarScopeMenuItem({ scope });
  return { element, markup: renderToStaticMarkup(element), queryOptions };
}

test("未所属の運営者に組織の業務画面への切り替えを表示しない", () => {
  assert.equal(render().markup, "");
});

for (const state of [
  { isPending: true },
  { isFetching: true },
  { isError: true },
]) {
  test(`所属の取得中・失敗時は以前の所属を根拠に切り替えを表示しない ${JSON.stringify(state)}`, () => {
    assert.equal(render({ data: [{ id: 1 }], ...state }).markup, "");
  });
}

test("有効な所属がある運営者は業務画面へ切り替えられる", () => {
  const result = render({ data: [{ id: 1 }] });
  assert.match(result.markup, /組織の業務画面へ/);
  assert.equal(result.element.props.disabled, false);
  assert.equal(result.queryOptions.enabled, true);
  assert.equal(result.queryOptions.refetchOnMount, "always");
  assert.deepEqual(result.queryOptions.queryKey, [
    "tenant-choices",
    "normal",
    7,
  ]);
  const previousWindow = global.window;
  const destinations = [];
  global.window = { location: { assign: (url) => destinations.push(url) } };
  try {
    result.element.props.onSelect();
    assert.deepEqual(destinations, ["/"]);
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
});

test("通常利用者には切り替えを表示せず、所属の追加取得も行わない", () => {
  const result = render({ admin: false, data: [{ id: 1 }] });
  assert.equal(result.markup, "");
  assert.equal(result.queryOptions.enabled, false);
});

test("業務画面から管理画面へは所属取得なしで戻れ、保存中は無効にする", () => {
  const result = render({ scope: "organization", isError: true, pending: 1 });
  assert.match(result.markup, /システム管理へ/);
  assert.equal(result.element.props.disabled, true);
  assert.equal(result.queryOptions.enabled, false);
});

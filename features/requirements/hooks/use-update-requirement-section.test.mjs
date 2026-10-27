import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

test("本文保存は開始版と本文だけをPATCHし、非表示の章属性を上書きしない", async () => {
  let request;
  let failure = null;
  let refreshes = 0;
  const conflict = new Error("版競合");
  const loaded = { exports: {} };
  const source = ts.transpileModule(
    readFileSync(
      new URL("./use-update-requirement-section.ts", import.meta.url),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  new Function("require", "module", "exports", source)(
    (name) =>
      ({
        "@tanstack/react-query": { useQueryClient: () => ({}) },
        "@/lib/api/generated/requirements/requirements": {
          useUpdateRequirementSectionProjectsProjectIdRequirementSectionsSectionIdPatch:
            () => ({
              mutateAsync: async (value) => {
                request = value;
                if (failure) throw failure;
                return { id: 8, version: 6 };
              },
            }),
        },
        "@/lib/api/conflict": {
          isVersionConflictError: (error) => error === conflict,
        },
        "../lib/requirement-cache": {
          invalidateRequirementSections: async () => {
            refreshes += 1;
          },
        },
      })[name] ?? {},
    loaded,
    loaded.exports,
  );
  const hook = loaded.exports.useUpdateRequirementSection(21, 9);
  await hook.updateRequirementSectionContent(8, 5, "本文だけの編集");
  assert.deepEqual(request, {
    projectId: 21,
    sectionId: 8,
    data: { version: 5, content: "本文だけの編集" },
  });
  await hook.updateRequirementSectionContent(8, 6, "");
  assert.equal(request.data.content, null);
  failure = new Error("保存失敗");
  await assert.rejects(
    hook.updateRequirementSectionContent(8, 6, "失敗後も保持"),
    /保存失敗/,
  );
  assert.equal(refreshes, 0);
  failure = conflict;
  await assert.rejects(
    hook.updateRequirementSectionContent(8, 6, "競合後も保持"),
    (error) => error === conflict,
  );
  assert.equal(refreshes, 1);
  assert.equal(request.data.version, 6);
});

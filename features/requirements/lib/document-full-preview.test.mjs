import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

async function load(file) {
  const code = ts.transpileModule(
    readFileSync(new URL(file, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
  );
}
const { composeDocumentPreview, isDocumentPreviewComplete } = await load(
  "./document-full-preview.ts",
);
const { documentPreviewSourceSearch } = await load(
  "./document-preview-navigation.ts",
);
const section = (id, sort_order) => ({
  id,
  sort_order,
  version: 3,
  title: `章${id}`,
  content: "保存済み",
  document_id: 9,
});
const requirement = (id, section_id = null) => ({
  id,
  document_id: 9,
  section_id,
  requirement_code: `REQ-${id}`,
  version: 2,
  description: "要件の説明",
  rationale: "理由",
  acceptance_criteria: "受け入れ条件",
});

test("章の編集順・同順序のIDを維持し、APIコード順のREQと未所属/所属不明を欠落させない", () => {
  const sections = [section(2, 20), section(3, 10), section(1, 10)];
  const requirements = [
    requirement(4, 2),
    requirement(2, 2),
    requirement(7),
    requirement(8, 99),
  ];
  const original = structuredClone({ sections, requirements });
  const { groups } = composeDocumentPreview(sections, requirements, {}, false);
  assert.deepEqual(
    groups.map((group) => group.id),
    [1, 3, 2, null],
  );
  assert.deepEqual(
    groups[2].requirements.map((item) => item.id),
    [4, 2],
  );
  assert.deepEqual(
    groups[3].requirements.map((item) => item.id),
    [7, 8],
  );
  assert.equal(groups[2].requirements[0].acceptance_criteria, "受け入れ条件");
  assert.deepEqual({ sections, requirements }, original);
});

test("未保存本文は明示切替だけで反映し、空文字での消去・開始版・競合/削除入力を守る", () => {
  const source = section(1, 1);
  const edits = {
    1: {
      section: { ...source, version: 2 },
      content: "",
      request: null,
      error: null,
    },
    9: {
      section: section(9, 9),
      content: "削除された章の入力",
      request: null,
      error: null,
    },
  };
  const before = structuredClone(edits);
  const saved = composeDocumentPreview([source], [], edits, false);
  const draft = composeDocumentPreview([source], [], edits, true);
  assert.equal(saved.groups[0].content, "保存済み");
  assert.equal(saved.groups[0].unsaved, false);
  assert.equal(draft.groups[0].content, "");
  assert.equal(draft.groups[0].unsaved, true);
  assert.equal(draft.groups.length, 1);
  assert.match(draft.warnings[0].message, /版3.*版2/);
  assert.match(draft.warnings[1].message, /掲載していません/);
  assert.deepEqual(edits, before);
});

test("100件超の未完了・重複・別文書を全文と判定せず、全件と空文書だけを完了にする", () => {
  const items = Array.from({ length: 101 }, (_, index) =>
    requirement(index + 1),
  );
  assert.equal(isDocumentPreviewComplete(items.slice(0, 100), 101, 9), false);
  assert.equal(
    isDocumentPreviewComplete([...items.slice(0, 100), items[0]], 101, 9),
    false,
  );
  assert.equal(
    isDocumentPreviewComplete([{ ...items[0], document_id: 10 }], 1, 9),
    false,
  );
  assert.equal(isDocumentPreviewComplete(items, 101, 9), true);
  assert.equal(isDocumentPreviewComplete([], 0, 9), true);
});

test("復帰は元の選択/検索条件を保ち、章/未所属REQへの移動時だけ対象を更新する", () => {
  const search = "tab=preview&sectionId=1&selectedRequirement=2&q=検索&page=3";
  const original = new URLSearchParams(documentPreviewSourceSearch(search));
  assert.equal(original.get("selectedRequirement"), "2");
  assert.equal(original.get("q"), "検索");
  assert.equal(original.get("tab"), "requirements");
  const chapter = new URLSearchParams(
    documentPreviewSourceSearch(search, { sectionId: 9 }),
  );
  assert.equal(chapter.get("sectionId"), "9");
  assert.equal(chapter.has("selectedRequirement"), false);
  const req = new URLSearchParams(
    documentPreviewSourceSearch(search, { sectionId: null, requirementId: 7 }),
  );
  assert.equal(req.has("sectionId"), false);
  assert.equal(req.get("selectedRequirement"), "7");
  assert.equal(req.get("reviewTarget"), "requirement");
  assert.equal(req.get("supportPanel"), "open");
  assert.equal(req.get("page"), "3");
});

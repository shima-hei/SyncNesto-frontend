import type { TestDesignRead, TestItemInput } from "@/lib/api/generated/model";

export type Design = TestDesignRead;
export const uid = () => crypto.randomUUID();
export const itemColumns = [
  ["code", "テスト項目ID"],
  ["target_feature", "対象画面・機能"],
  ["viewpoint", "テスト観点"],
  ["content", "テスト内容"],
  ["preconditions", "前提条件"],
  ["steps", "操作・実行手順"],
  ["test_data", "入力値・テストデータ"],
  ["expected_result", "期待結果"],
  ["notes", "備考"],
] as const;

export function nextCode(prefix: string, codes: string[]) {
  return codeSequence(prefix, codes)();
}

export function codeSequence(prefix: string, codes: string[]) {
  const used = new Set(codes);
  let n = 1;
  return () => {
    while (used.has(`${prefix}${String(n).padStart(3, "0")}`)) n++;
    const code = `${prefix}${String(n++).padStart(3, "0")}`;
    used.add(code);
    return code;
  };
}

export function newItem(design: Design): TestItemInput {
  return {
    id: uid(),
    code: nextCode(
      "T",
      design.items.map((r) => r.code),
    ),
    position: design.items.length,
    custom_values: {},
  };
}

export function renumberItems(design: Design) {
  let number = 0;
  design.items.forEach((item, position) => {
    item.position = position;
    if (!item.is_spacer) item.code = `T${String(++number).padStart(3, "0")}`;
  });
}

export function withOrderedItemCodes(design: Design): Design {
  const next = structuredClone(design);
  renumberItems(next);
  return next.items.some(
    (item, index) => item.code !== design.items[index].code,
  )
    ? next
    : design;
}

export function insertItem(design: Design, beforeId: string, spacer: boolean) {
  if (design.items.length >= 10000) throw new Error("項目は10,000行までです");
  const index = design.items.findIndex((item) => item.id === beforeId);
  const at = index < 0 ? design.items.length : index;
  const item = spacer
    ? {
        id: uid(),
        code: `S${uid().replaceAll("-", "")}`,
        is_spacer: true,
        custom_values: {},
      }
    : newItem(design);
  design.items.splice(at, 0, item);
  renumberItems(design);
}

export function removeItems(design: Design, ids: Set<string>) {
  design.items = design.items.filter((r) => !ids.has(r.id));
  renumberItems(design);
  design.links = design.links.filter((r) => !ids.has(r.item_id));
}

export function removeFactors(design: Design, ids: Set<string>) {
  design.factors = design.factors.filter((r) => !ids.has(r.id));
  design.levels = design.levels.filter((r) => !ids.has(r.factor_id));
  design.values = design.values.filter((r) => !ids.has(r.factor_id));
}

export function removePatterns(design: Design, ids: Set<string>) {
  design.expected_selections = (design.expected_selections ?? []).filter(
    (v) => !ids.has(v.pattern_id),
  );
  design.patterns = design.patterns.filter((r) => !ids.has(r.id));
  design.values = design.values.filter((r) => !ids.has(r.pattern_id));
  design.links = design.links.filter((r) => !ids.has(r.pattern_id));
}

export function generatePatterns(design: Design) {
  const groups = design.factors.map((f) =>
    design.levels.filter((l) => l.factor_id === f.id),
  );
  const count = groups.reduce((n, levels) => n * levels.length, 1);
  if (!groups.length || groups.some((g) => !g.length))
    throw new Error("各因子に水準を登録してください");
  if (count > 10000 || count * groups.length > 100000)
    throw new Error(
      "生成上限（パターン10,000件・選択水準100,000件）を超えます。因子を絞ってください",
    );
  const values = new Map(
    design.values.map((v) => [`${v.pattern_id}:${v.factor_id}`, v.level_id]),
  );
  const existing = new Set(
    design.patterns.map((p) =>
      design.factors.map((f) => values.get(`${p.id}:${f.id}`) ?? "-").join(":"),
    ),
  );
  let combinations: string[][] = [[]];
  for (const levels of groups)
    combinations = combinations.flatMap((row) =>
      levels.map((l) => [...row, l.id]),
    );
  const additions = combinations.filter(
    (levels) => !existing.has(levels.join(":")),
  );
  if (
    additions.length + design.patterns.length > 10000 ||
    additions.length * groups.length + design.values.length > 100000
  )
    throw new Error("既存データと合わせて生成上限を超えます");
  const allocateCode = codeSequence(
    "P",
    design.patterns.map((p) => p.code),
  );
  for (const levels of additions) {
    const pattern = {
      id: uid(),
      code: allocateCode(),
      enabled: true,
      position: design.patterns.length,
    };
    design.patterns.push(pattern);
    levels.forEach((level_id, i) =>
      design.values.push({
        id: uid(),
        pattern_id: pattern.id,
        factor_id: design.factors[i].id,
        level_id,
      }),
    );
  }
}

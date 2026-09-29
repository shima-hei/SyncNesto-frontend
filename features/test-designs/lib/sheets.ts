import type {
  CellEdit,
  GridColumn,
  GridRow,
} from "../components/tables/design-grid";
import {
  itemColumns,
  newItem,
  nextCode,
  codeSequence,
  removeFactors,
  removeItems,
  removePatterns,
  renumberItems,
  uid,
  type Design,
} from "./design";

export const sheets = ["items", "patterns", "cases"] as const;
export type Sheet = (typeof sheets)[number] | "factors" | "levels" | "links";
export const sheetLabels: Record<Sheet, string> = {
  items: "テスト項目",
  factors: "因子",
  levels: "水準",
  patterns: "パターン管理",
  links: "紐付け",
  cases: "テストケース",
};

export function gridData(
  design: Design,
  sheet: Sheet,
): { columns: GridColumn[]; rows: GridRow[] } {
  const factorNames = new Map(design.factors.map((f) => [f.id, f.name]));
  const levelNames = new Map(design.levels.map((l) => [l.id, l.name]));
  const itemCodes = new Map(design.items.map((i) => [i.id, i.code]));
  const patternCodes = new Map(design.patterns.map((p) => [p.id, p.code]));
  if (sheet === "items")
    return {
      columns: [
        ...itemColumns
          .slice(0, 8)
          .map(([key, label]) => ({ key, label, readOnly: key === "code" })),
        {
          key: "pattern_table_id",
          label: "パターン",
          options: ["", ...(design.pattern_tables ?? []).map((t) => t.name)],
        },
        ...itemColumns.slice(8).map(([key, label]) => ({ key, label })),
        ...design.columns.map((c) => ({ key: c.key, label: c.label })),
      ],
      rows: design.items.map((item) => ({
        id: item.id,
        spacer: item.is_spacer,
        values: {
          ...Object.fromEntries(
            itemColumns.map(([key]) => [
              key,
              item.is_spacer ? "" : (item[key] ?? ""),
            ]),
          ),
          ...item.custom_values,
          pattern_table_id: item.is_spacer
            ? ""
            : (design.pattern_tables?.find(
                (t) => t.id === item.pattern_table_id,
              )?.name ?? ""),
        },
      })),
    };
  if (sheet === "factors")
    return {
      columns: [{ key: "name", label: "因子名" }],
      rows: design.factors.map((f) => ({ id: f.id, values: { name: f.name } })),
    };
  if (sheet === "levels")
    return {
      columns: [
        {
          key: "factor",
          label: "因子",
          options: design.factors.map((f) => f.name),
        },
        { key: "name", label: "水準名" },
      ],
      rows: design.levels.map((l) => ({
        id: l.id,
        values: { factor: factorNames.get(l.factor_id) ?? "", name: l.name },
      })),
    };
  if (sheet === "patterns") {
    const values = new Map(
      design.values.map((v) => [`${v.pattern_id}:${v.factor_id}`, v.level_id]),
    );
    return {
      columns: [
        { key: "code", label: "Pattern" },
        ...design.factors.map((f) => ({
          key: f.id,
          label: f.name,
          options: [
            "-",
            ...design.levels
              .filter((l) => l.factor_id === f.id)
              .map((l) => l.name),
          ],
        })),
        { key: "enabled", label: "有効 / 無効", options: ["有効", "無効"] },
        { key: "description", label: "説明" },
        { key: "notes", label: "備考" },
      ],
      rows: design.patterns.map((p) => ({
        id: p.id,
        values: {
          code: p.code,
          enabled: p.enabled === false ? "無効" : "有効",
          description: p.description ?? "",
          notes: p.notes ?? "",
          ...Object.fromEntries(
            design.factors.map((f) => [
              f.id,
              levelNames.get(values.get(`${p.id}:${f.id}`) ?? "") ?? "-",
            ]),
          ),
        },
      })),
    };
  }
  return {
    columns: [
      {
        key: "item",
        label: "テスト項目ID",
        options: design.items.filter((i) => !i.is_spacer).map((i) => i.code),
      },
      {
        key: "pattern",
        label: "Pattern",
        options: design.patterns.map((p) => p.code),
      },
    ],
    rows: design.links.map((l) => ({
      id: l.id,
      values: {
        item: itemCodes.get(l.item_id) ?? "",
        pattern: patternCodes.get(l.pattern_id) ?? "",
      },
    })),
  };
}

export function addRow(design: Design, sheet: Sheet) {
  if (sheet === "items") {
    if (design.items.length >= 10000) throw new Error("項目は10,000行までです");
    design.items.push(newItem(design));
    renumberItems(design);
  } else if (sheet === "factors") {
    if (design.factors.length >= 100) throw new Error("因子は100件までです");
    design.factors.push({
      id: uid(),
      name: nextCode(
        "因子",
        design.factors.map((f) => f.name),
      ),
      position: design.factors.length,
    });
  } else if (sheet === "levels") {
    if (!design.factors.length) throw new Error("先に因子を登録してください");
    const factor_id = design.factors[0].id;
    design.levels.push({
      id: uid(),
      factor_id,
      name: nextCode(
        "水準",
        design.levels
          .filter((l) => l.factor_id === factor_id)
          .map((l) => l.name),
      ),
      position: design.levels.length,
    });
  } else if (sheet === "patterns") {
    if (design.patterns.length >= 10000)
      throw new Error("パターンは10,000行までです");
    design.patterns.push({
      id: uid(),
      code: nextCode(
        "P",
        design.patterns.map((p) => p.code),
      ),
      enabled: true,
      position: design.patterns.length,
    });
  } else if (sheet === "links") {
    const linked = new Set(
      design.links.map((l) => `${l.item_id}:${l.pattern_id}`),
    );
    for (const item of design.items)
      for (const pattern of design.patterns) {
        if (!linked.has(`${item.id}:${pattern.id}`)) {
          design.links.push({
            id: uid(),
            item_id: item.id,
            pattern_id: pattern.id,
            position: design.links.length,
          });
          return;
        }
      }
    throw new Error(
      "項目とパターンを登録してください。登録済みの組み合わせは重複できません",
    );
  }
}

export function deleteRows(design: Design, sheet: Sheet, ids: string[]) {
  const selected = new Set(ids);
  if (sheet === "items") removeItems(design, selected);
  if (sheet === "factors") removeFactors(design, selected);
  if (sheet === "levels") {
    design.levels = design.levels.filter((l) => !selected.has(l.id));
    design.values = design.values.map((v) =>
      selected.has(v.level_id ?? "") ? { ...v, level_id: null } : v,
    );
  }
  if (sheet === "patterns") removePatterns(design, selected);
  if (sheet === "links")
    design.links = design.links.filter((l) => !selected.has(l.id));
  design.layout.cells = Object.fromEntries(
    Object.entries(design.layout.cells ?? {}).filter(
      ([key]) => !ids.some((id) => key.startsWith(`${sheet}:${id}:`)),
    ),
  );
}

function unique(values: string[], label: string) {
  const present = values.filter((v) => v.trim());
  if (new Set(present).size !== present.length)
    throw new Error(`${label}は重複にできません`);
}

export function editCells(
  design: Design,
  sheet: Sheet,
  edits: CellEdit[],
  requiredRows: number,
) {
  if (sheet === "cases") return;
  if (sheet === "items")
    edits = edits.filter((e) => e.key !== "code" && e.key !== "case_count");
  const originalItemCount = design.items.length;
  if (sheet === "items") {
    const existingCount = design.items.length;
    const populated = [
      ...new Set(
        edits
          .filter((e) => e.row >= existingCount && e.value.trim())
          .map((e) => e.row),
      ),
    ].sort((a, b) => a - b);
    const positions = new Map(
      populated.map((row, i) => [row, existingCount + i]),
    );
    edits = edits
      .filter((e) => e.row < existingCount || positions.has(e.row))
      .map((e) => ({ ...e, row: positions.get(e.row) ?? e.row }));
    requiredRows = Math.max(
      design.items.length,
      ...edits.filter((e) => e.value.trim()).map((e) => e.row + 1),
    );
    if (requiredRows > 10000) throw new Error("項目は10,000行までです");
    const allocateCode = codeSequence(
      "T",
      design.items.map((i) => i.code),
    );
    while (design.items.length < requiredRows)
      design.items.push({
        id: uid(),
        code: allocateCode(),
        position: design.items.length,
        custom_values: {},
      });
  }
  while (design[sheet].length < requiredRows) addRow(design, sheet);
  const changedLinks = new Set<string>();
  for (const edit of edits) {
    if (edit.value.length > 20000) throw new Error("セルは20,000文字までです");
    const row = design[sheet][edit.row];
    if (!row) continue;
    if (sheet === "items") {
      const item = design.items[edit.row];
      if (edit.key === "case_count" || edit.key === "code") continue;
      if (item.is_spacer && edit.value.trim()) {
        item.is_spacer = false;
        item.code = nextCode(
          "T",
          design.items.filter((i) => !i.is_spacer).map((i) => i.code),
        );
      }
      if (item.is_spacer) continue;
      if (edit.key === "pattern_table_id") {
        const table = design.pattern_tables?.find((t) => t.name === edit.value);
        if (edit.value && edit.value !== "なし" && !table)
          throw new Error("登録済みのパターン表を選択してください");
        item.pattern_table_id = table?.id ?? null;
        design.links = design.links.filter((l) => l.item_id !== item.id);
        continue;
      }
      if (
        edit.row >= originalItemCount &&
        edit.key === "code" &&
        !edit.value.trim()
      )
        continue;
      if (edit.key.startsWith("custom_"))
        item.custom_values = { ...item.custom_values, [edit.key]: edit.value };
      else Object.assign(item, { [edit.key]: edit.value });
    } else if (sheet === "factors") design.factors[edit.row].name = edit.value;
    else if (sheet === "levels") {
      const level = design.levels[edit.row];
      if (edit.key === "name") level.name = edit.value;
      else {
        const factor = design.factors.find((f) => f.name === edit.value);
        if (!factor) throw new Error(`因子「${edit.value}」が存在しません`);
        if (level.factor_id !== factor.id)
          design.values = design.values.map((v) =>
            v.level_id === level.id ? { ...v, level_id: null } : v,
          );
        level.factor_id = factor.id;
      }
    } else if (sheet === "patterns") {
      const pattern = design.patterns[edit.row];
      if (edit.key === "enabled") {
        if (!["有効", "無効"].includes(edit.value))
          throw new Error("有効 または 無効を入力してください");
        pattern.enabled = edit.value === "有効";
      } else if (["code", "description", "notes"].includes(edit.key))
        Object.assign(pattern, { [edit.key]: edit.value });
      else {
        const level = design.levels.find(
          (l) => l.factor_id === edit.key && l.name === edit.value,
        );
        if (edit.value && edit.value !== "-" && !level)
          throw new Error(`水準「${edit.value}」がこの因子に存在しません`);
        const value = design.values.find(
          (v) => v.pattern_id === pattern.id && v.factor_id === edit.key,
        );
        if (value) value.level_id = level?.id ?? null;
        else
          design.values.push({
            id: uid(),
            pattern_id: pattern.id,
            factor_id: edit.key,
            level_id: level?.id ?? null,
          });
      }
    } else if (sheet === "links") {
      const link = design.links[edit.row];
      if (edit.key === "item") {
        const item = design.items.find((i) => i.code === edit.value);
        if (!item) throw new Error("登録済みのテスト項目IDを入力してください");
        if (link.item_id !== item.id) {
          changedLinks.add(link.id);
          link.item_id = item.id;
        }
      } else {
        const pattern = design.patterns.find((p) => p.code === edit.value);
        if (!pattern) throw new Error("登録済みのパターンIDを入力してください");
        if (link.pattern_id !== pattern.id) {
          changedLinks.add(link.id);
          link.pattern_id = pattern.id;
        }
      }
    }
    if (edit.style)
      design.layout.cells = {
        ...design.layout.cells,
        [`${sheet}:${row.id}:${edit.key}`]: edit.style,
      };
  }
  design.links = design.links.map((l) =>
    changedLinks.has(l.id) ? { ...l, id: uid() } : l,
  );
  if (sheet === "items") renumberItems(design);
  unique(
    design.items.map((i) => i.code),
    "テスト項目ID",
  );
  unique(
    design.patterns.map((p) => `${p.table_id ?? ""}:${p.code}`),
    "パターンID",
  );
  unique(
    design.factors.map((f) => `${f.table_id ?? ""}:${f.name}`),
    "因子名",
  );
  for (const f of design.factors)
    unique(
      design.levels.filter((l) => l.factor_id === f.id).map((l) => l.name),
      "同じ因子内の水準名",
    );
  unique(
    design.links.map((l) => `${l.item_id}:${l.pattern_id}`),
    "紐付け",
  );
}

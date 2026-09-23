import { type Design, nextCode, uid, removeFactors } from "./design";
import type { CellEdit, GridRow } from "../components/tables/design-grid";

export function matrixRows(d: Design): GridRow[] {
  const rows: GridRow[] = [
    ...["code", "enabled", "description", "notes"].map((key, i) => ({
      id: `meta:${key}`,
      values: {
        factor: "パターン",
        level: ["ID", "有効 / 無効", "説明", "備考"][i],
        ...Object.fromEntries(
          d.patterns.map((p) => [
            p.id,
            key === "enabled"
              ? p.enabled === false
                ? "無効"
                : "有効"
              : String(p[key as "code"] ?? ""),
          ]),
        ),
      },
    })),
  ];
  const selected = new Map<string, Record<string, string>>();
  for (const v of d.values)
    if (v.level_id) {
      if (!selected.has(v.level_id)) selected.set(v.level_id, {});
      selected.get(v.level_id)![v.pattern_id] = "○";
    }
  for (const f of d.factors) {
    const levels = d.levels.filter((l) => l.factor_id === f.id);
    if (!levels.length)
      rows.push({
        id: `factor:${f.id}`,
        values: { factor: f.name, level: "" },
      });
    levels.forEach((l, i) =>
      rows.push({
        id: l.id,
        values: {
          factor: i === 0 ? f.name : "",
          level: l.name,
          ...selected.get(l.id),
        },
      }),
    );
  }
  const expected = new Map<string, Record<string, string>>();
  for (const v of d.expected_selections ?? []) {
    if (!expected.has(v.expected_value_id))
      expected.set(v.expected_value_id, {});
    expected.get(v.expected_value_id)![v.pattern_id] = "●";
  }
  (d.expected_values ?? []).forEach((v, i) =>
    rows.push({
      id: `expected:${v.id}`,
      sectionStart: i === 0,
      values: {
        factor: i === 0 ? "期待値" : "",
        level: v.name,
        ...expected.get(v.id),
      },
    }),
  );
  return rows;
}

export function editMatrix(d: Design, edits: CellEdit[]) {
  const rows = matrixRows(d);
  for (const e of edits) {
    const row = rows[e.row];
    if (!row) throw new Error("先に因子・水準または期待値を追加してください");
    if (row.id.startsWith("meta:")) {
      if (e.key === "factor" || e.key === "level") continue;
      const p = d.patterns.find((p) => p.id === e.key)!;
      const field = row.id.slice(5);
      if (field === "enabled") {
        if (!["有効", "無効"].includes(e.value))
          throw new Error("有効 / 無効を入力してください");
        p.enabled = e.value === "有効";
      } else Object.assign(p, { [field]: e.value });
    } else {
      const expected = (d.expected_values ?? []).find(
        (v) => `expected:${v.id}` === row.id,
      );
      const level = d.levels.find((l) => l.id === row.id);
      const factor = d.factors.find(
        (f) => f.id === level?.factor_id || `factor:${f.id}` === row.id,
      );
      if (e.key === "factor") {
        if (factor && e.value.trim()) factor.name = e.value;
      } else if (e.key === "level") {
        if (expected) expected.name = e.value;
        else if (level) level.name = e.value;
        else if (factor && e.value.trim())
          d.levels.push({
            id: uid(),
            factor_id: factor.id,
            name: e.value,
            position: d.levels.length,
          });
      } else {
        if (
          !["", "-", "○", "〇", "◯", "●", "⚫", "⚫︎", "1"].includes(
            e.value.trim(),
          )
        )
          throw new Error("選択は○または●、解除は空欄を入力してください");
        const checked = !["", "-"].includes(e.value.trim());
        if (expected) {
          d.expected_selections ??= [];
          d.expected_selections = d.expected_selections.filter(
            (v) =>
              v.pattern_id !== e.key || v.expected_value_id !== expected.id,
          );
          if (checked)
            d.expected_selections.push({
              id: uid(),
              pattern_id: e.key,
              expected_value_id: expected.id,
            });
        } else if (level && factor) {
          const value = d.values.find(
            (v) => v.pattern_id === e.key && v.factor_id === factor.id,
          );
          if (checked) {
            if (value) value.level_id = level.id;
            else
              d.values.push({
                id: uid(),
                pattern_id: e.key,
                factor_id: factor.id,
                level_id: level.id,
              });
          } else if (value?.level_id === level.id) value.level_id = null;
        }
      }
    }
    if (e.style)
      d.layout.cells = {
        ...d.layout.cells,
        [`matrix:${row.id}:${e.key}`]: e.style,
      };
  }
  for (const values of [
    d.patterns.map((p) => p.code),
    d.factors.map((f) => f.name),
    (d.expected_values ?? []).map((v) => v.name),
    ...d.factors.map((f) =>
      d.levels.filter((l) => l.factor_id === f.id).map((l) => l.name),
    ),
  ]) {
    if (values.some((v) => !v.trim()) || new Set(values).size !== values.length)
      throw new Error("ID・名称は空欄または重複にできません");
  }
}

export function duplicatePattern(d: Design, id: string) {
  const original = d.patterns.find((p) => p.id === id);
  if (!original) throw new Error("複製するパターン列を選択してください");
  if (d.patterns.length >= 10000) throw new Error("パターンは10,000件までです");
  const p = {
    ...original,
    id: uid(),
    code: nextCode(
      "P",
      d.patterns.map((p) => p.code),
    ),
    position: d.patterns.length,
  };
  d.patterns.push(p);
  d.values.push(
    ...d.values
      .filter((v) => v.pattern_id === id)
      .map((v) => ({ ...v, id: uid(), pattern_id: p.id })),
  );
  d.expected_selections ??= [];
  d.expected_selections.push(
    ...d.expected_selections
      .filter((v) => v.pattern_id === id)
      .map((v) => ({ ...v, id: uid(), pattern_id: p.id })),
  );
  return p.id;
}

export function removeMatrixRows(d: Design, ids: string[]) {
  const selected = new Set(ids);
  removeFactors(
    d,
    new Set(
      ids.filter((id) => id.startsWith("factor:")).map((id) => id.slice(7)),
    ),
  );
  d.levels = d.levels.filter((l) => !selected.has(l.id));
  d.values.forEach((v) => {
    if (selected.has(v.level_id ?? "")) v.level_id = null;
  });
  d.expected_values = (d.expected_values ?? []).filter(
    (v) => !selected.has(`expected:${v.id}`),
  );
  d.expected_selections = (d.expected_selections ?? []).filter(
    (v) => !selected.has(`expected:${v.expected_value_id}`),
  );
}

export function patternSummary(d: Design, id: string) {
  const values = d.values.filter((v) => v.pattern_id === id);
  const parts = values.map(
    (v) =>
      `${d.factors.find((f) => f.id === v.factor_id)?.name}=${d.levels.find((l) => l.id === v.level_id)?.name ?? "対象外"}`,
  );
  const expectations = (d.expected_selections ?? []).filter(
    (v) => v.pattern_id === id,
  );
  for (const expected of expectations)
    parts.push(
      `期待値=${d.expected_values?.find((v) => v.id === expected.expected_value_id)?.name}`,
    );
  return parts.join(" / ") || "水準・期待値未選択";
}

export function patternSummaries(d: Design) {
  const factors = new Map(d.factors.map((f) => [f.id, f.name]));
  const levels = new Map(d.levels.map((l) => [l.id, l.name]));
  const expected = new Map(
    (d.expected_values ?? []).map((v) => [v.id, v.name]),
  );
  const parts = new Map<string, string[]>();
  const append = (id: string, text: string) => {
    if (!parts.has(id)) parts.set(id, []);
    parts.get(id)!.push(text);
  };
  for (const v of d.values)
    append(
      v.pattern_id,
      `${factors.get(v.factor_id)}=${levels.get(v.level_id ?? "") ?? "対象外"}`,
    );
  for (const v of d.expected_selections ?? [])
    append(v.pattern_id, `期待値=${expected.get(v.expected_value_id)}`);
  return new Map(
    d.patterns.map((p) => [
      p.id,
      parts.get(p.id)?.join(" / ") || "水準・期待値未選択",
    ]),
  );
}

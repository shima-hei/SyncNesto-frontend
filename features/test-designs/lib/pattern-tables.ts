import { type Design, uid, nextCode } from "./design";

export function caseCount(d: Design, itemId: string) {
  const item = d.items.find((i) => i.id === itemId);
  if (item?.is_spacer) return 0;
  return item?.pattern_table_id
    ? d.patterns.filter(
        (p) => p.table_id === item.pattern_table_id && p.enabled !== false,
      ).length
    : 1;
}

export function caseCounts(d: Design) {
  const counts = new Map<string, number>();
  for (const p of d.patterns)
    if (p.table_id && p.enabled !== false)
      counts.set(p.table_id, (counts.get(p.table_id) ?? 0) + 1);
  return new Map(
    d.items
      .filter((i) => !i.is_spacer)
      .map((i) => [
        i.id,
        i.pattern_table_id ? (counts.get(i.pattern_table_id) ?? 0) : 1,
      ]),
  );
}

export function createPatternTable(d: Design, itemId?: string) {
  d.pattern_tables ??= [];
  const id = uid();
  d.pattern_tables.push({
    id,
    name: nextCode(
      "パターン表",
      d.pattern_tables.map((t) => t.name),
    ),
    position: d.pattern_tables.length,
  });
  if (itemId) {
    const item = d.items.find((i) => i.id === itemId);
    if (item) item.pattern_table_id = id;
  }
  return id;
}

export function tableDesign(d: Design, id: string): Design {
  const factors = d.factors.filter((f) => f.table_id === id);
  const factorIds = new Set(factors.map((f) => f.id));
  const patterns = d.patterns.filter((p) => p.table_id === id);
  const patternIds = new Set(patterns.map((p) => p.id));
  return {
    ...d,
    factors,
    patterns,
    levels: d.levels.filter((l) => factorIds.has(l.factor_id)),
    values: d.values.filter((v) => patternIds.has(v.pattern_id)),
    expected_values: (d.expected_values ?? []).filter((v) => v.table_id === id),
    expected_selections: (d.expected_selections ?? []).filter((v) =>
      patternIds.has(v.pattern_id),
    ),
    links: [],
    items: d.items.filter((i) => i.pattern_table_id === id),
  };
}

export function editPatternTable(
  d: Design,
  id: string,
  mutate: (view: Design) => void,
) {
  const old = tableDesign(d, id);
  const view = structuredClone(old);
  mutate(view);
  for (const key of ["factors", "patterns", "expected_values"] as const) {
    const rows = view[key] ?? [];
    rows.forEach((r) => (r.table_id = id));
  }
  for (const key of [
    "factors",
    "levels",
    "patterns",
    "values",
    "expected_values",
    "expected_selections",
  ] as const) {
    const ids = new Set((old[key] ?? []).map((r) => r.id));
    Object.assign(d, {
      [key]: [
        ...(d[key] ?? []).filter((r) => !ids.has(r.id)),
        ...(view[key] ?? []),
      ],
    });
  }
  d.layout = view.layout;
}

export function deletePatternTable(d: Design, id: string) {
  editPatternTable(d, id, (view) => {
    view.factors = [];
    view.levels = [];
    view.patterns = [];
    view.values = [];
    view.expected_values = [];
    view.expected_selections = [];
  });
  d.pattern_tables = (d.pattern_tables ?? []).filter((t) => t.id !== id);
  d.items.forEach((i) => {
    if (i.pattern_table_id === id) i.pattern_table_id = null;
  });
  const valid = new Set(d.patterns.map((p) => p.id));
  d.links = d.links.filter((l) => valid.has(l.pattern_id));
}

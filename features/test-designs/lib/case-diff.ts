import type { TestItemInput } from "@/lib/api/generated/model";
import { getChangeLogDiffRows } from "../../../lib/change-log/diff";
import { itemColumns } from "./design";

export type CaseSource = {
  item: TestItemInput;
  pattern: {
    id?: string;
    code: string;
    description?: string;
    notes?: string;
  } | null;
  pattern_table?: { id: string; name: string };
  values: {
    factor_id?: string;
    factor: string;
    level: string | null;
    level_id?: string | null;
  }[];
  expected_value?: { id: string; name: string };
  expected_values?: { id: string; name: string }[];
  columns?: Record<string, string>;
};

type DesignFields = {
  values: Record<string, string>;
  labels: Record<string, string>;
};

function designFields(source: CaseSource): DesignFields {
  const values: Record<string, string> = {};
  const labels: Record<string, string> = {};
  for (const [key, label] of itemColumns) {
    if (key === "code") continue;
    values[key] = String(source.item[key] ?? "");
    labels[key] = label;
  }
  values.pattern_table = source.pattern_table?.name ?? "";
  labels.pattern_table = "パターン表";
  values.pattern = source.pattern
    ? `${source.pattern.code}${source.pattern.description ? `\n${source.pattern.description}` : ""}`
    : "";
  labels.pattern = "組み合わせ";
  values.pattern_notes = source.pattern?.notes ?? "";
  labels.pattern_notes = "組み合わせの備考";
  for (const factor of source.values ?? []) {
    const key = `factor:${factor.factor_id ?? factor.factor}`;
    values[key] = `${factor.factor}：${factor.level ?? "－"}`;
    labels[key] = factor.factor;
  }
  const expected =
    source.expected_values ??
    (source.expected_value ? [source.expected_value] : []);
  values.expected_values = expected.map((value) => value.name).join("\n");
  labels.expected_values = "パターンの期待値";
  const custom = source.item.custom_values ?? {};
  const columnKeys = new Set([
    ...Object.keys(source.columns ?? {}),
    ...Object.keys(custom),
  ]);
  for (const key of columnKeys) {
    const label = source.columns?.[key] ?? key;
    values[`custom:${key}`] = `${label}：${custom[key] ?? "－"}`;
    labels[`custom:${key}`] = label;
  }
  return { values, labels };
}

export function getCaseDesignDiff(before: CaseSource, after: CaseSource) {
  const oldFields = designFields(before);
  const newFields = designFields(after);
  const rows = getChangeLogDiffRows({
    oldValue: oldFields.values,
    newValue: newFields.values,
    formatField: (field) =>
      newFields.labels[field] ?? oldFields.labels[field] ?? field,
    formatValue: (value) => String(value ?? "") || "－",
  });
  const sameNameReferenceChanged = (
    field: string,
    label: string,
    name: string,
    oldId?: string | null,
    newId?: string | null,
  ) => {
    if (oldId && newId && oldId !== newId) {
      rows.push({
        field,
        label,
        oldValue: `以前の「${name}」`,
        newValue: `別の「${name}」に変更`,
      });
    }
  };
  if (
    before.pattern_table?.name &&
    before.pattern_table.name === after.pattern_table?.name
  ) {
    sameNameReferenceChanged(
      "pattern_table_reference",
      "パターン表の参照先",
      before.pattern_table.name,
      before.pattern_table.id,
      after.pattern_table.id,
    );
  }
  if (before.pattern?.code && before.pattern.code === after.pattern?.code) {
    sameNameReferenceChanged(
      "pattern_reference",
      "組み合わせの参照先",
      before.pattern.code,
      before.pattern.id,
      after.pattern.id,
    );
  }
  for (const oldValue of before.values ?? []) {
    const newValue = after.values?.find(
      (value) => value.factor_id === oldValue.factor_id,
    );
    if (oldValue.level && oldValue.level === newValue?.level) {
      sameNameReferenceChanged(
        `level_reference:${oldValue.factor_id}`,
        `${oldValue.factor}の水準の参照先`,
        oldValue.level,
        oldValue.level_id,
        newValue?.level_id,
      );
    }
  }
  const oldExpected = expectedValues(before);
  const newExpected = expectedValues(after);
  if (
    oldExpected.length === newExpected.length &&
    oldExpected.map((value) => value.name).join("\n") ===
      newExpected.map((value) => value.name).join("\n") &&
    oldExpected.some((value, index) => value.id !== newExpected[index].id)
  ) {
    rows.push({
      field: "expected_value_reference",
      label: "パターンの期待値の参照先",
      oldValue: "以前の期待値",
      newValue: "同名の別の期待値に変更",
    });
  }
  return rows;
}

const expectedValues = (source: CaseSource) =>
  source.expected_values ??
  (source.expected_value ? [source.expected_value] : []);

export function getCaseDesignSummary(source: CaseSource) {
  const fields = designFields(source);
  return Object.entries(fields.values)
    .filter(([, value]) => value.trim() !== "")
    .map(([key, value]) => ({
      key,
      label: fields.labels[key] ?? key,
      value,
    }));
}

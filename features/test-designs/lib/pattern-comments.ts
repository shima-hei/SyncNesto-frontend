import type {
  TestDesignCommentCreate,
  TestDesignCommentRead,
} from "@/lib/api/generated/model";
import type { Design } from "./design";

export type DesignCommentTarget = Pick<
  TestDesignCommentCreate,
  "target_type" | "target_id" | "field"
>;
export function commentTargetKey(target: {
  target_type: string;
  target_id?: string | null;
  field?: string | null;
}) {
  return `${target.target_type}:${target.target_id ?? ""}:${target.field ?? ""}`;
}
export function commentScopeKey(target: {
  target_type: string;
  target_id?: string | null;
}) {
  return `${target.target_type}:${target.target_id ?? ""}`;
}

export function patternCommentIndex(design: Design) {
  const tables = new Map<string, string>();
  const labels = new Map<string, string>();
  const add = (
    type: DesignCommentTarget["target_type"],
    id: string,
    tableId: string | null | undefined,
    label: string,
  ) => {
    if (tableId) tables.set(`${type}:${id}`, tableId);
    labels.set(`${type}:${id}:name`, label);
  };
  for (const table of design.pattern_tables ?? [])
    add("pattern_table", table.id, table.id, `パターン表 · ${table.name}`);
  const factors = new Map(design.factors.map((factor) => [factor.id, factor]));
  const expected = new Map(
    (design.expected_values ?? []).map((value) => [value.id, value]),
  );
  for (const factor of design.factors)
    add("factor", factor.id, factor.table_id, `因子 · ${factor.name}`);
  for (const level of design.levels) {
    const factor = factors.get(level.factor_id);
    add(
      "factor_level",
      level.id,
      factor?.table_id,
      `${factor?.name ?? "因子"} · ${level.name}`,
    );
  }
  for (const value of expected.values())
    add("expected_value", value.id, value.table_id, `期待値 · ${value.name}`);
  for (const pattern of design.patterns) {
    if (pattern.table_id)
      tables.set(`combination:${pattern.id}`, pattern.table_id);
    for (const [field, label] of Object.entries({
      code: "組み合わせ名",
      enabled: "有効 / 無効",
      description: "説明",
      notes: "備考",
    }))
      labels.set(
        `combination:${pattern.id}:${field}`,
        `${pattern.code} · ${label}`,
      );
  }
  return { tables, labels, factors, expected };
}

export function createMatrixCommentTarget(design: Design) {
  const levels = new Map(design.levels.map((value) => [value.id, value]));
  const factors = new Map(design.factors.map((value) => [value.id, value]));
  const expectations = new Map(
    (design.expected_values ?? []).map((value) => [
      `expected:${value.id}`,
      value,
    ]),
  );
  const patterns = new Map(design.patterns.map((value) => [value.id, value]));
  return (rowId: string, columnKey: string) => {
    const level = levels.get(rowId);
    const factor = factors.get(
      level?.factor_id ?? (rowId.startsWith("factor:") ? rowId.slice(7) : ""),
    );
    const expected = expectations.get(rowId);
    const pattern = patterns.get(columnKey);
    let target: DesignCommentTarget;
    let label: string;
    if (pattern && factor) {
      target = {
        target_type: "combination",
        target_id: pattern.id,
        field: level ? `level:${factor.id}:${level.id}` : `level:${factor.id}`,
      };
      label = `${pattern.code} · ${factor.name}${level ? ` · ${level.name}` : ""}`;
    } else if (pattern && expected) {
      target = {
        target_type: "combination",
        target_id: pattern.id,
        field: `expected:${expected.id}`,
      };
      label = `${pattern.code} · 期待値 · ${expected.name}`;
    } else if (expected) {
      target = {
        target_type: "expected_value",
        target_id: expected.id,
        field: "name",
      };
      label = `期待値 · ${expected.name}`;
    } else if (factor && columnKey === "factor") {
      target = { target_type: "factor", target_id: factor.id, field: "name" };
      label = `因子 · ${factor.name}`;
    } else if (level) {
      target = {
        target_type: "factor_level",
        target_id: level.id,
        field: "name",
      };
      label = `${factor?.name ?? "因子"} · ${level.name}`;
    } else return null;
    return { target, label };
  };
}

export function matrixCommentFocus(
  design: Design,
  target: DesignCommentTarget,
) {
  const id = target.target_id;
  if (!id) return null;
  if (
    target.target_type === "factor" &&
    !design.factors.some((factor) => factor.id === id)
  )
    return null;
  if (
    target.target_type === "factor_level" &&
    !design.levels.some((level) => level.id === id)
  )
    return null;
  if (
    target.target_type === "expected_value" &&
    !design.expected_values?.some((value) => value.id === id)
  )
    return null;
  if (
    target.target_type === "combination" &&
    !design.patterns.some((pattern) => pattern.id === id)
  )
    return null;
  if (target.target_type === "factor")
    return {
      rowId:
        design.levels.find((level) => level.factor_id === id)?.id ??
        `factor:${id}`,
      columnKey: "factor",
    };
  if (target.target_type === "factor_level")
    return { rowId: id, columnKey: "level" };
  if (target.target_type === "expected_value")
    return { rowId: `expected:${id}`, columnKey: "level" };
  if (
    target.target_type === "combination" &&
    target.field?.startsWith("expected:")
  ) {
    if (
      !design.expected_values?.some(
        (value) => `expected:${value.id}` === target.field,
      )
    )
      return null;
    return { rowId: target.field, columnKey: id };
  }
  if (
    target.target_type === "combination" &&
    target.field?.startsWith("level:")
  ) {
    const [, factorId, levelId] = target.field.split(":");
    if (!design.factors.some((factor) => factor.id === factorId)) return null;
    if (levelId)
      return design.levels.some(
        (level) => level.id === levelId && level.factor_id === factorId,
      )
        ? { rowId: levelId, columnKey: id }
        : null;
    const value = design.values.find(
      (value) => value.pattern_id === id && value.factor_id === factorId,
    );
    return {
      rowId:
        value?.level_id ??
        design.levels.find((level) => level.factor_id === factorId)?.id ??
        `factor:${factorId}`,
      columnKey: id,
    };
  }
  if (target.target_type === "combination") {
    const factor = design.factors[0];
    const expected = design.expected_values?.[0];
    const rowId = factor
      ? (design.levels.find((level) => level.factor_id === factor.id)?.id ??
        `factor:${factor.id}`)
      : expected
        ? `expected:${expected.id}`
        : undefined;
    if (rowId) return { rowId, columnKey: id };
  }
  return null;
}

export function commentMatchesTarget(
  comment: Pick<TestDesignCommentRead, "target_type" | "target_id" | "field">,
  target: DesignCommentTarget,
) {
  if (commentTargetKey(comment) === commentTargetKey(target)) return true;
  return (
    comment.target_type === "combination" &&
    target.target_type === "combination" &&
    comment.target_id === target.target_id &&
    !!target.field?.startsWith("level:") &&
    target.field.split(":").length === 3 &&
    comment.field === target.field.split(":").slice(0, 2).join(":")
  );
}

export function commentCounts(
  comments: TestDesignCommentRead[],
  design?: Design,
) {
  const counts = new Map<string, number>();
  const levels = new Map<string, string[]>();
  for (const level of design?.levels ?? [])
    levels.set(level.factor_id, [
      ...(levels.get(level.factor_id) ?? []),
      level.id,
    ]);
  for (const comment of comments) {
    if (comment.deleted_at) continue;
    const key = commentTargetKey(comment);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (
      comment.target_type === "combination" &&
      comment.field?.startsWith("level:") &&
      comment.field.split(":").length === 2
    ) {
      for (const levelId of levels.get(comment.field.slice(6)) ?? []) {
        const cellKey = `${key}:${levelId}`;
        counts.set(cellKey, (counts.get(cellKey) ?? 0) + 1);
      }
    }
  }
  return counts;
}

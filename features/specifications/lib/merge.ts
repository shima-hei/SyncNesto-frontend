import type { Values } from "./specification";

type Json =
  | string
  | number
  | boolean
  | null
  | undefined
  | Json[]
  | { [key: string]: Json };
export type MergeConflict = {
  original: unknown;
  local: unknown;
  current: unknown;
};
type Choices = Record<string, "local" | "current">;

function equal(left: Json, right: Json): boolean {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right))
    return (
      left.length === right.length &&
      left.every((value, index) => equal(value, right[index]))
    );
  if (object(left) && object(right)) {
    const keys = Object.keys(left);
    return (
      keys.length === Object.keys(right).length &&
      keys.every((key) => key in right && equal(left[key], right[key]))
    );
  }
  return false;
}
function object(value: Json): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function rows(value: Json): value is (Record<string, Json> & { id: string })[] {
  return (
    Array.isArray(value) &&
    value.every((item) => object(item) && typeof item.id === "string")
  );
}

export function mergeSpecifications(
  original: Values,
  local: Values,
  current: Values,
  choices: Choices = {},
) {
  const conflicts: Record<string, MergeConflict> = {};
  const conflict = (path: string, before: Json, mine: Json, theirs: Json) => {
    conflicts[path] = { original: before, local: mine, current: theirs };
    return choices[path] === "current" ? theirs : mine;
  };
  const merge = (
    before: Json,
    mine: Json,
    theirs: Json,
    path: string,
  ): Json => {
    if (equal(mine, before)) return theirs;
    if (equal(theirs, before) || equal(mine, theirs)) return mine;
    if (rows(before) && rows(mine) && rows(theirs)) {
      const beforeIds = before.map((item) => item.id);
      const mineIds = mine.map((item) => item.id);
      const theirIds = theirs.map((item) => item.id);
      const ids = [...new Set([...mineIds, ...theirIds, ...beforeIds])];
      const merged = new Map(
        ids.map((id) => [
          id,
          merge(
            before.find((item) => item.id === id),
            mine.find((item) => item.id === id),
            theirs.find((item) => item.id === id),
            `${path}/${id}`,
          ),
        ]),
      );
      let order = equal(mineIds, beforeIds) ? theirIds : mineIds;
      if (
        !equal(mineIds, beforeIds) &&
        !equal(theirIds, beforeIds) &&
        !equal(mineIds, theirIds) &&
        beforeIds.length === mineIds.length &&
        mineIds.every((id) => theirIds.includes(id))
      )
        order = conflict(
          `${path}/@order`,
          beforeIds,
          mineIds,
          theirIds,
        ) as string[];
      return [...new Set([...order, ...ids])]
        .map((id) => merged.get(id))
        .filter((value) => value !== undefined);
    }
    if (object(before) && object(mine) && object(theirs))
      return Object.fromEntries(
        [
          ...new Set([
            ...Object.keys(before),
            ...Object.keys(mine),
            ...Object.keys(theirs),
          ]),
        ].map((key) => [
          key,
          merge(
            before[key],
            mine[key],
            theirs[key],
            path ? `${path}/${key}` : key,
          ),
        ]),
      );
    return conflict(path, before, mine, theirs);
  };
  const values = merge(
    original as unknown as Json,
    local as unknown as Json,
    current as unknown as Json,
    "",
  ) as unknown as Values;
  return { values, conflicts };
}

export function describeConflict(value: unknown, values: Values[]): string {
  const labels: Record<string, string> = {
    name: "項目名",
    data_type: "データ型",
    required: "必須",
    description: "内容",
    example: "記入例",
    validation: "入力規則",
    location: "受け渡し・表示",
    destination: "遷移先・応答例",
  };
  if (value === undefined) return "この項目を削除";
  if (value === null || value === "") return "未記入";
  if (typeof value === "boolean") return value ? "はい" : "いいえ";
  if (Array.isArray(value))
    return value
      .map((item) => {
        if (typeof item === "string") {
          for (const data of values)
            for (const list of Object.values(data.content))
              if (Array.isArray(list)) {
                const found = list.find((row) => row.id === item);
                if (found) return found.name || "名称未設定";
              }
        }
        return describeConflict(item, values);
      })
      .join("\n");
  if (typeof value === "object")
    return Object.entries(value)
      .filter(([key]) => key !== "id" && key !== "type")
      .map(
        ([key, item]) =>
          `${labels[key] ?? key}: ${describeConflict(item, values)}`,
      )
      .join("\n");
  return String(value);
}

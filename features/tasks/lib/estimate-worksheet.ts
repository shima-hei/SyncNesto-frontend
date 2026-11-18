import type {
  EstimateWorksheetChange,
  EstimateWorksheetRow,
} from "@/lib/api/generated/model";
import {
  calculateEstimate,
  estimateFormValues,
  estimateMethodLabels,
} from "./task-estimate";

export type SheetMethod = keyof typeof estimateMethodLabels;
export type SheetValues = ReturnType<typeof estimateFormValues>;
export const sheetFields = {
  simple: ["hours"],
  pert: ["optimistic", "likely", "pessimistic"],
  triangular: ["optimistic", "likely", "pessimistic"],
  parametric: ["quantity", "unitHours"],
  analogous: ["referenceWork", "referenceHours", "factor"],
} as const;
export type SheetField = (typeof sheetFields)[SheetMethod][number];
export const sheetLabels: Record<SheetField, string> = {
  hours: "見積 (h)",
  optimistic: "楽観 (h)",
  likely: "最頻 (h)",
  pessimistic: "悲観 (h)",
  quantity: "数量",
  unitHours: "単位工数 (h)",
  referenceWork: "参照元の作業",
  referenceHours: "参照工数 (h)",
  factor: "補正係数",
};
export const sheetFormula: Record<SheetMethod, string> = {
  simple: "作業量を時間で入力",
  pert: "（楽観 ＋ 4 × 最頻 ＋ 悲観）÷ 6",
  triangular: "（楽観 ＋ 最頻 ＋ 悲観）÷ 3",
  parametric: "数量 × 単位工数",
  analogous: "参照工数 × 補正係数",
};
export type SheetDraft = {
  base: EstimateWorksheetRow;
  title: string;
  values: SheetValues;
};
export function startingValues(
  base: EstimateWorksheetRow,
  method: SheetMethod,
) {
  const old = base.current;
  const compatible =
    old.method === method ||
    ((old.method === "pert" || old.method === "triangular") &&
      (method === "pert" || method === "triangular"));
  const values = estimateFormValues(
    compatible
      ? old
      : { task_version: base.version, assumptions: old.assumptions },
  );
  return { ...values, method };
}
export function fieldError(field: SheetField, value: string) {
  if (field === "referenceWork")
    return Array.from(value.trim()).length > 200
      ? "参照元は200文字以内で入力してください。"
      : null;
  if (!value) return null;
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))
    return sheetLabels[field] + "には0以上の数値を入力してください。";
  if (
    ["quantity", "unitHours", "factor"].includes(field) &&
    !/^(?:\d{1,8}(?:\.\d{0,4})?|\.\d{1,4})$/.test(value)
  )
    return sheetLabels[field] + "は整数部8桁、小数部4桁以内です。";
  return null;
}
export function draftError(values: SheetValues) {
  for (const field of sheetFields[values.method]) {
    if (!values[field].trim())
      return sheetLabels[field] + "を入力してください。";
    const error = fieldError(field, values[field]);
    if (error) return error;
  }
  if (
    (values.method === "pert" || values.method === "triangular") &&
    (Number(values.optimistic) > Number(values.likely) ||
      Number(values.likely) > Number(values.pessimistic))
  )
    return "楽観 ≤ 最頻 ≤ 悲観の順で入力してください。";
  return calculateEstimate(values).minutes == null
    ? "分換算した値が保存範囲を超えています。"
    : null;
}
export function worksheetChange({
  base,
  values,
}: SheetDraft): EstimateWorksheetChange {
  return {
    task_id: base.task_id,
    version: base.version,
    method: values.method,
    assumptions: values.assumptions || null,
    ...calculateEstimate(values).inputs,
  };
}

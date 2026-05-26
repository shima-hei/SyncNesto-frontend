import type { ProjectFormValues } from "../types/project-form";

export const PROJECT_CONFLICT_FIELD_LABELS = {
  projectCode: "プロジェクトコード",
  name: "プロジェクト名",
  description: "説明",
  status: "ステータス",
  startDate: "開始日",
  endDate: "終了日",
} satisfies Partial<Record<keyof ProjectFormValues, string>>;

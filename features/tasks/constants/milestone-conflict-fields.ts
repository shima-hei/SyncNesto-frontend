import type { MilestoneFormValues } from "../types/milestone-form";

export const MILESTONE_CONFLICT_FIELD_LABELS: Partial<
  Record<keyof MilestoneFormValues, string>
> = {
  title: "タイトル",
  description: "説明",
  targetDate: "目標日",
  status: "ステータス",
};

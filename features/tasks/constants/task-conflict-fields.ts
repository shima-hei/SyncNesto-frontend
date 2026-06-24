import type { TaskFormValues } from "../types/task-form";

export const TASK_CONFLICT_FIELD_LABELS: Partial<
  Record<keyof TaskFormValues, string>
> = {
  taskCode: "タスクID",
  title: "タイトル",
  description: "説明",
  taskType: "種別",
  status: "ステータス",
  priority: "優先度",
  assigneeId: "担当者",
  reporterId: "報告者",
  startDate: "開始日",
  dueDate: "終了予定日",
  actualStartDate: "実績開始日",
  actualEndDate: "実績終了日",
  progressPercent: "進捗率",
  estimatedMinutes: "見積時間",
  actualMinutes: "実績時間",
  parentTaskId: "親タスク",
  requirementId: "関連要件",
  relationType: "関連種別",
  tags: "タグ",
  sortOrder: "並び順",
  changeReason: "更新理由",
};

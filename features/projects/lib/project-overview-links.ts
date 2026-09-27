import type {
  OverviewAttention,
  ProjectActivity,
} from "@/lib/api/generated/model";

const base = (projectId: number) => `/projects/joined/${projectId}`;

export function attentionHref(projectId: number, item: OverviewAttention) {
  if (item.kind.startsWith("task_") || item.kind === "issue_open") {
    return `${base(projectId)}/tasks/${item.target_id}`;
  }
  if (item.kind.startsWith("test_") && item.design_id) {
    return `${base(projectId)}/test-cases?design=${item.design_id}&case=${item.target_id}`;
  }
  if (item.kind === "requirement_uncovered" && item.document_id) {
    return `${base(projectId)}/requirements/${item.document_id}/items/${item.target_id}`;
  }
  return base(projectId);
}

export function activityHref(projectId: number, item: ProjectActivity) {
  if (item.kind === "task" || item.kind === "issue") {
    return `${base(projectId)}/tasks/${item.target_id}`;
  }
  if (item.kind === "requirement" && item.document_id) {
    return item.target_id === String(item.document_id)
      ? `${base(projectId)}/requirements/${item.document_id}`
      : `${base(projectId)}/requirements/${item.document_id}/items/${item.target_id}`;
  }
  if (item.kind === "test_design" && item.design_id) {
    return `${base(projectId)}/test-designs/${item.design_id}`;
  }
  if (item.kind === "test_execution" && item.design_id) {
    return `${base(projectId)}/test-cases?design=${item.design_id}&case=${item.target_id}`;
  }
  return base(projectId);
}

export const attentionKindLabel: Record<string, string> = {
  task_overdue: "期限超過",
  task_blocked: "ブロック",
  test_failed_no_issue: "Issue未登録NG",
  test_failed: "NGテスト",
  issue_open: "Issue",
  requirement_uncovered: "要件",
};

export function activityDescription(item: ProjectActivity) {
  const action: Record<string, string> = {
    created: "作成",
    updated: "更新",
    deleted: "削除",
    "status.changed": "状態変更",
    completed: "完了",
    "assignee.changed": "担当変更",
    "schedule.changed": "日程変更",
    "progress.changed": "進捗更新",
    passed: "OKで実行",
    failed: "NGで実行",
    blocked: "保留で実行",
    not_applicable: "対象外に変更",
    cases_generated: "ケース生成",
    case_updated: "ケース更新",
    case_refreshed: "ケース反映",
  };
  const kind: Record<string, string> = {
    requirement: "要件",
    task: "タスク",
    issue: "Issue",
    test_design: "テスト設計",
    test_execution: "テストケース",
  };
  return `${kind[item.kind] ?? "変更"}を${action[item.action] ?? "更新"}`;
}

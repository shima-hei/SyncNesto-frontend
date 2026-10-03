import type { NotificationRead } from "@/lib/api/generated/model";

export function notificationMessage(notification: NotificationRead) {
  const { actor_name, target_title } = notification.snapshot;
  switch (notification.type) {
    case "assigned":
      return `${actor_name}さんがあなたを「${target_title}」の${notification.target_type === "requirement" ? "オーナー" : "担当者"}に設定しました`;
    case "mentioned":
      return `${actor_name}さんが「${target_title}」のコメントであなたをメンションしました`;
  }
}

export function notificationHref(
  notification: NotificationRead,
): string | null {
  if (notification.target_status !== "available" || !notification.project_id) {
    return null;
  }
  const base = `/projects/joined/${notification.project_id}`;
  const {
    document_id,
    requirement_id,
    task_id,
    design_id,
    subject_type,
    subject_id,
  } = notification.context;
  const targetId = encodeURIComponent(notification.target_id);
  switch (notification.target_type) {
    case "task":
      return `${base}/tasks/${targetId}`;
    case "requirement":
      return document_id
        ? `${base}/requirements/${document_id}/items/${targetId}`
        : null;
    case "open_issue":
      return document_id
        ? `${base}/requirements/${document_id}?tab=issues`
        : null;
    case "task_comment":
      return task_id ? `${base}/tasks/${task_id}` : null;
    case "requirement_comment":
      return document_id && requirement_id
        ? `${base}/requirements/${document_id}/items/${requirement_id}`
        : null;
    case "requirement_target_comment":
      if (!document_id) return null;
      if (requirement_id)
        return `${base}/requirements/${document_id}/items/${requirement_id}`;
      return `${base}/requirements/${document_id}?tab=${subject_type === "open_issue" ? "issues" : "overview"}`;
    case "test_design_comment": {
      if (!design_id) return null;
      const params = new URLSearchParams();
      if (subject_type === "test_item" && subject_id)
        params.set("item", subject_id);
      if (subject_type === "pattern_table" && subject_id) {
        params.set("tab", "patterns");
        params.set("table", subject_id);
      }
      return `${base}/test-designs/${design_id}${params.size ? `?${params}` : ""}`;
    }
  }
}

export function notificationDateGroup(createdAt: string, now = new Date()) {
  const date = new Date(createdAt);
  const dateKey = (value: Date) =>
    `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
  if (dateKey(date) === dateKey(now)) return "今日";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey(date) === dateKey(yesterday)) return "昨日";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

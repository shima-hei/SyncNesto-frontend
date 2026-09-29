import type { HomeTaskRead } from "@/lib/api/generated/model";

export const homeTaskHref = (task: Pick<HomeTaskRead, "id" | "project_id">) =>
  `/projects/joined/${task.project_id}/tasks/${task.id}`;

export function formatCalendarDate(date: string, header = false) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "UTC",
    month: "numeric",
    day: "numeric",
    ...(header ? ({ weekday: "short" } as const) : {}),
  }).format(new Date(`${date}T00:00:00Z`));
}

export function homeDueState(dueDate: string | null, today: string) {
  if (!dueDate) return "undated";
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  return "upcoming";
}

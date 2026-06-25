import type { TaskRead } from "@/lib/api/generated/model";

export const UNSCHEDULED_TASK_DND_TYPE =
  "application/x-syncnesto-unscheduled-task";

export const hasDraggedUnscheduledTask = (dataTransfer: DataTransfer) => {
  return Array.from(dataTransfer.types).includes(UNSCHEDULED_TASK_DND_TYPE);
};

export const getDraggedUnscheduledTaskId = (dataTransfer: DataTransfer) => {
  const taskId = Number(dataTransfer.getData(UNSCHEDULED_TASK_DND_TYPE));

  return Number.isFinite(taskId) ? taskId : null;
};

export const setUnscheduledTaskDragImage = (
  event: React.DragEvent<HTMLElement>,
  task: TaskRead
) => {
  const preview = document.createElement("div");

  preview.textContent = task.title;
  preview.className =
    "pointer-events-none fixed max-w-56 truncate rounded-lg border bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-lg";
  preview.style.top = "-1000px";
  preview.style.left = "-1000px";

  document.body.appendChild(preview);
  event.dataTransfer.setDragImage(preview, 12, 12);
  window.setTimeout(() => preview.remove(), 0);
};

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { TaskRead } from "@/lib/api/generated/model";
import {
  getTaskEstimateTasksTaskIdEstimateGet,
  getGetTaskEstimateTasksTaskIdEstimateGetQueryKey,
  updateTaskEstimateTasksTaskIdEstimatePatch,
} from "@/lib/api/generated/task-estimates/task-estimates";
import { updateTaskPlanningTasksTaskIdPlanningPatch } from "@/lib/api/generated/tasks/tasks";
import { invalidateTaskProjectSurfaces } from "../../lib/task-cache";
import { parseEstimateHours, toHourInput } from "../../lib/task-estimate";
import {
  PlanningCellInput,
  type CellExit,
} from "../shared/planning-cell-input";

export type EditableMinutes =
  "estimated_minutes" | "planned_minutes" | "remaining_minutes";

export function EffortInlineCell({
  task,
  field,
  label,
  onClose,
  onTab,
}: {
  task: TaskRead;
  field: EditableMinutes;
  label: string;
  onClose: (exit: CellExit) => void;
  onTab: (backwards: boolean) => boolean;
}) {
  const client = useQueryClient();
  return (
    <PlanningCellInput
      numeric
      required={field === "estimated_minutes"}
      initial={toHourInput(task[field])}
      label={label + "（h）"}
      onExit={onClose}
      onTab={onTab}
      onSave={async (value) => {
        const minutes = parseEstimateHours(value);
        if (minutes === null && (value || field === "estimated_minutes"))
          throw new Error("分単位で保存できる工数を入力してください。");
        try {
          if (field === "estimated_minutes") {
            const detail = await getTaskEstimateTasksTaskIdEstimateGet(task.id);
            if (
              detail.version !== task.version ||
              (detail.current.method && detail.current.method !== "simple")
            )
              throw new Error(
                "このタスクが更新されました。最新の見積を確認してください。",
              );
            await updateTaskEstimateTasksTaskIdEstimatePatch(task.id, {
              version: task.version,
              method: "simple",
              minutes,
              assumptions: detail.current.assumptions,
            });
          } else
            await updateTaskPlanningTasksTaskIdPlanningPatch(task.id, {
              version: task.version,
              [field]: minutes,
            });
        } finally {
          await Promise.all([
            invalidateTaskProjectSurfaces(client, task.project_id, {
              includeBoard: true,
            }),
            client.invalidateQueries({
              queryKey: getGetTaskEstimateTasksTaskIdEstimateGetQueryKey(
                task.id,
              ),
            }),
          ]);
        }
        toast.success(task.title + "の" + label + "を保存しました。");
      }}
    />
  );
}

import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import type { PhaseRead, TaskRead } from "@/lib/api/generated/model";
import {
  getTaskEstimateTasksTaskIdEstimateGet,
  getGetTaskEstimateTasksTaskIdEstimateGetQueryKey,
  updateTaskEstimateTasksTaskIdEstimatePatch,
} from "@/lib/api/generated/task-estimates/task-estimates";
import { updateTaskPlanningTasksTaskIdPlanningPatch } from "@/lib/api/generated/tasks/tasks";
import { invalidateTaskProjectSurfaces } from "../../lib/task-cache";
import { parseEstimateHours, toHourInput } from "../../lib/task-estimate";

import { getTaskPhaseOptions } from "../../lib/task-phase-options";
import { getPlanningPhaseKey } from "../../lib/planning-phases";
import { TaskUserSelectField } from "../forms/task-user-select-field";
import { transferPhaseTasksProjectsProjectIdPhasesTransferTasksPost } from "@/lib/api/generated/phase-transfers/phase-transfers";
import { toPhaseAssignment } from "../../lib/task-mappers";
import { selectStyle } from "./effort-controls";

export type EditableMinutes =
  "estimated_minutes" | "planned_minutes" | "remaining_minutes";

export type EditableEffortField = EditableMinutes | "phase" | "assignee_id";
export function EffortInlineCell({
  task,
  field,
  label,
  phases,
  onClose,
}: {
  task: TaskRead;
  field: EditableEffortField;
  phases: PhaseRead[];
  label: string;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (field === "assignee_id") form.current?.querySelector("button")?.focus();
  }, [field]);
  const initial =
    field === "phase"
      ? getPlanningPhaseKey(task)
      : field === "assignee_id"
        ? String(task.assignee_id ?? "")
        : toHourInput(task[field]);
  const [value, setValue] = useState(initial);
  const parsed = parseEstimateHours(value);
  const invalid =
    field !== "assignee_id" &&
    field !== "phase" &&
    parsed === null &&
    (value.trim() !== "" || field === "estimated_minutes");
  const save = useMutation({
    mutationFn: async () => {
      if (field === "phase") {
        await transferPhaseTasksProjectsProjectIdPhasesTransferTasksPost(
          task.project_id,
          {
            tasks: [{ id: task.id, version: task.version }],
            destination: toPhaseAssignment(value),
          },
        );
      } else if (field === "assignee_id") {
        await updateTaskPlanningTasksTaskIdPlanningPatch(task.id, {
          version: task.version,
          assignee_id: value ? Number(value) : null,
        });
      } else if (field === "estimated_minutes") {
        const detail = await getTaskEstimateTasksTaskIdEstimateGet(task.id);
        if (
          detail.version !== task.version ||
          (detail.current.method && detail.current.method !== "simple")
        )
          throw new Error(
            "このタスクが更新されました。編集を閉じ、最新値を確認してください。",
          );
        if (parsed === null) throw new Error("見積工数を入力してください。");
        await updateTaskEstimateTasksTaskIdEstimatePatch(task.id, {
          version: task.version,
          method: "simple",
          minutes: parsed,
          assumptions: detail.current.assumptions,
        });
      } else {
        await updateTaskPlanningTasksTaskIdPlanningPatch(task.id, {
          version: task.version,
          [field]: parsed,
        });
      }
    },
    onSuccess: async () => {
      await Promise.all([
        invalidateTaskProjectSurfaces(client, task.project_id, {
          includeBoard: true,
        }),
        client.invalidateQueries({
          queryKey: getGetTaskEstimateTasksTaskIdEstimateGetQueryKey(task.id),
        }),
      ]);
      toast.success(`${task.title}の${label}を保存しました。`);
      onClose();
    },
    onError: () => {
      void invalidateTaskProjectSurfaces(client, task.project_id);
    },
  });
  return (
    <form
      ref={form}
      data-effort-dirty={value !== initial}
      data-effort-pending={save.isPending}
      aria-label={`${task.title}の${label}を編集`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !e.defaultPrevented && !save.isPending) {
          e.stopPropagation();
          onClose();
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (value === initial) onClose();
        else if (!invalid && !save.isPending) save.mutate();
      }}
      className="grid gap-1"
    >
      <div className="flex items-center gap-0.5">
        {field === "phase" ? (
          <select
            autoFocus
            className={selectStyle}
            value={value}
            aria-label="移動先の工程"
            disabled={save.isPending}
            onChange={(e) => setValue(e.target.value)}
          >
            {getTaskPhaseOptions(phases, value, initial).map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
          </select>
        ) : field === "assignee_id" ? (
          <TaskUserSelectField
            projectId={task.project_id}
            label="担当者"
            value={value}
            onChange={setValue}
            disabled={save.isPending}
          />
        ) : (
          <Input
            aria-label={`${label}（h）`}
            autoFocus
            type="number"
            className="h-7 w-20"
            step="any"
            min="0"
            max={toHourInput(2147483647)}
            required={field === "estimated_minutes"}
            disabled={save.isPending}
            value={value}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setValue(e.target.value)}
          />
        )}
        <Button
          type="submit"
          size="icon-xs"
          variant="ghost"
          aria-label="セルを保存"
          disabled={invalid || save.isPending}
        >
          <CheckIcon />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label="セルの編集を取消"
          disabled={save.isPending}
          onClick={onClose}
        >
          <XIcon />
        </Button>
      </div>
      {save.isPending && <small role="status">保存中…</small>}
      <FormApiError error={save.error} />
    </form>
  );
}

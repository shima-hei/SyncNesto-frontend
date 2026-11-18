"use client";

import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getConflictCurrent } from "@/lib/api/conflict";
import type {
  TaskEstimateRead,
  TaskPlanningUpdate,
  TaskRead,
} from "@/lib/api/generated/model";
import { updateTaskPlanningTasksTaskIdPlanningPatch } from "@/lib/api/generated/tasks/tasks";
import {
  invalidateTaskProjectSurfaces,
  setTaskDetailCache,
} from "../../lib/task-cache";
import { formatEstimateHours } from "../../lib/task-effort";
import { parseEstimateHours, toHourInput } from "../../lib/task-estimate";

const effortFields = [
  { key: "planned_minutes", label: "計画工数" },
  { key: "remaining_minutes", label: "残工数" },
] as const;

type EffortDraft = { version: number } & Partial<
  Record<(typeof effortFields)[number]["key"], string>
>;

export function TaskEffortPlanEditor({
  projectId,
  taskId,
  detail,
  canCopyEstimate,
  canUpdate,
  refresh,
}: {
  projectId: number;
  taskId: number;
  detail: TaskEstimateRead;
  canCopyEstimate: boolean;
  canUpdate: boolean;
  refresh: () => Promise<TaskEstimateRead | undefined>;
}) {
  const id = useId();
  const client = useQueryClient();
  const [draft, setDraft] = useState<EffortDraft>();
  const save = useMutation({
    mutationFn: (payload: TaskPlanningUpdate) =>
      updateTaskPlanningTasksTaskIdPlanningPatch(taskId, payload),
    onSuccess: async (saved) => {
      setTaskDetailCache(client, taskId, saved);
      await Promise.all([
        refresh(),
        invalidateTaskProjectSurfaces(client, projectId, {
          includeBoard: true,
        }),
      ]);
      setDraft(undefined);
      toast.success("計画工数と残工数を保存しました。");
    },
  });
  const conflict = getConflictCurrent<TaskRead>(save.error);
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="space-y-2 border-t pt-3"
    >
      <h4 id={`${id}-title`} className="font-medium">
        計画工数・残工数
      </h4>
      {canUpdate ? (
        <form
          data-effort-dirty={Boolean(draft)}
          data-effort-pending={save.isPending}
          aria-labelledby={`${id}-title`}
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!draft || save.isPending || conflict) return;
            const payload: TaskPlanningUpdate = { version: draft.version };
            for (const { key } of effortFields) {
              const hours = draft[key];
              if (hours === undefined) continue;
              const minutes = parseEstimateHours(hours);
              if (minutes !== (detail[key] ?? null)) payload[key] = minutes;
            }
            if (Object.keys(payload).length > 1) save.mutate(payload);
            else setDraft(undefined);
          }}
        >
          {canCopyEstimate && detail.current.minutes != null && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={save.isPending || Boolean(conflict)}
              onClick={() =>
                setDraft({
                  version: detail.version,
                  ...draft,
                  planned_minutes: toHourInput(detail.current.minutes),
                })
              }
            >
              見積 {formatEstimateHours(detail.current.minutes)}{" "}
              を計画欄にコピー
            </Button>
          )}
          <fieldset
            disabled={save.isPending}
            className="grid gap-2 sm:grid-cols-2"
          >
            {effortFields.map(({ key, label }) => (
              <div key={key} className="grid min-w-0 gap-1">
                <label htmlFor={`${id}-${key}`} className="text-xs font-medium">
                  {label}（h）
                </label>
                <Input
                  id={`${id}-${key}`}
                  aria-describedby={`${id}-hint`}
                  type="number"
                  min={0}
                  max={toHourInput(2147483647)}
                  step="any"
                  value={draft?.[key] ?? toHourInput(detail[key])}
                  onChange={(event) =>
                    setDraft({
                      version: detail.version,
                      ...draft,
                      [key]: event.target.value,
                    })
                  }
                />
              </div>
            ))}
          </fieldset>
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            タスク自身の工数を入力。空欄は未入力として扱います。
          </p>
          <FormApiError error={save.error} />
          {draft && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={save.isPending || Boolean(conflict)}
              >
                計画工数・残工数を保存
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={save.isPending}
                onClick={() => {
                  save.reset();
                  setDraft(undefined);
                }}
              >
                入力を破棄
              </Button>
              {conflict && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const latest = await refresh();
                    if (latest) {
                      setDraft(
                        (current) =>
                          current && { ...current, version: latest.version },
                      );
                      save.reset();
                    }
                  }}
                >
                  最新の版で入力を確認
                </Button>
              )}
            </div>
          )}
        </form>
      ) : (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {effortFields.map(({ key, label }) => (
            <div key={key}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd>{formatEstimateHours(detail[key])}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

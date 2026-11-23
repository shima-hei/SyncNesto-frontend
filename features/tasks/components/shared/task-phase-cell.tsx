"use client";

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { PhaseRead, TaskRead } from "@/lib/api/generated/model";
import { transferPhaseTasksProjectsProjectIdPhasesTransferTasksPost } from "@/lib/api/generated/phase-transfers/phase-transfers";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";
import {
  invalidateTaskChangeLogs,
  invalidateTaskProjectSurfaces,
} from "../../lib/task-cache";
import { getTaskPhaseOptions } from "../../lib/task-phase-options";
import { getPlanningPhaseKey } from "../../lib/planning-phases";
import { toPhaseAssignment } from "../../lib/task-mappers";
import { taskPhaseLabel } from "../../lib/task-effort";
import { phaseColors } from "../../lib/phase-colors";

export function TaskPhaseCell({
  task,
  phases,
  editable,
  compact = false,
  quiet = false,
}: {
  task: TaskRead;
  phases: PhaseRead[];
  editable: boolean;
  compact?: boolean;
  quiet?: boolean;
}) {
  const client = useQueryClient();
  const trigger = useRef<HTMLButtonElement>(null);
  const region = useRef<HTMLElement | null>(null);
  const version = useRef(task.version);
  const current = getPlanningPhaseKey(task);
  const phase = phases.find((p) => p.id === task.phase_id);
  const label = phase?.name ?? taskPhaseLabel(task);
  const save = useMutation({
    mutationFn: (value: string) =>
      transferPhaseTasksProjectsProjectIdPhasesTransferTasksPost(
        task.project_id,
        {
          tasks: [{ id: task.id, version: version.current }],
          destination: toPhaseAssignment(value),
        },
      ),
    onError: (e) =>
      toast.error(getApiErrorMessage(e), {
        description: task.title + "の工程",
      }),
    onSuccess: () => {
      toast.success(task.title + "の工程を変更しました。");
    },
    onSettled: async () => {
      await Promise.all([
        invalidateTaskProjectSurfaces(client, task.project_id, {
          includeBoard: true,
        }),
        invalidateTaskChangeLogs(client, task.id),
      ]);
      requestAnimationFrame(() => {
        if (
          document.activeElement !== document.body ||
          !region.current?.isConnected
        )
          return;
        const fallback =
          region.current.querySelector<HTMLElement>(
            `[data-phase-task="${task.id}"]`,
          ) ?? region.current;
        if (!fallback.hasAttribute("tabindex") && fallback.tagName !== "BUTTON")
          fallback.tabIndex = -1;
        fallback.focus({ preventScroll: true });
      });
    },
  });
  const dot = (
    <span
      aria-hidden
      className={
        "size-2 shrink-0 rounded-sm " +
        (phase?.color
          ? phaseColors[phase.color].className
          : "bg-muted-foreground")
      }
    />
  );
  if (!editable)
    return (
      <span className="inline-flex min-w-0 items-center gap-1">
        {dot}
        <span className="truncate">{label}</span>
      </span>
    );
  return (
    <Select
      value={current}
      disabled={save.isPending}
      onOpenChange={(open) => {
        if (open) {
          version.current = task.version;
          region.current =
            trigger.current?.closest<HTMLElement>(
              'section, [role="region"], table',
            ) ?? null;
        }
      }}
      onValueChange={(value) => {
        if (value !== current) save.mutate(value);
      }}
    >
      <SelectTrigger
        ref={trigger}
        data-phase-task={task.id}
        size="sm"
        aria-label={task.title + "の工程を変更"}
        title={"所属工程　" + label}
        data-cell="phase"
        aria-busy={save.isPending}
        data-effort-pending={save.isPending}
        className={cn(
          "max-w-full shrink-0 gap-1 rounded-sm border-transparent px-1 text-xs hover:bg-accent dark:bg-transparent",
          quiet &&
            "cursor-pointer dark:hover:bg-accent focus-visible:bg-accent [&>svg:last-child]:hidden",
        )}
      >
        {dot}
        {!compact && <span className="min-w-0 truncate">{label}</span>}
      </SelectTrigger>
      <SelectContent position="popper" align="start" collisionPadding={8}>
        {getTaskPhaseOptions(phases, current, current).map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

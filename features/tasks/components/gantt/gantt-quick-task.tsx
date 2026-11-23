"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { TaskQuickCreate } from "../forms/task-quick-create";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TaskRead } from "@/lib/api/generated/model";

import { useCreateTask } from "../../hooks/use-create-task";
import type { TaskPlanningController } from "../../hooks/use-task-planning";
import { defaultTaskFormValues } from "../../lib/task-mappers";

export type GanttTaskCreateTarget = {
  label: string;
  phaseAssignment: string;
  parentTaskId?: number;
};

export function GanttQuickTask({
  projectId,
  planning,
  open,
  target,
  onCreated,
}: {
  projectId: number;
  planning: TaskPlanningController;
  open: boolean;
  target?: GanttTaskCreateTarget;
  onCreated?: (created: TaskRead) => void;
}) {
  const { createTask, error, isPending } = useCreateTask(projectId);
  return (
    <div hidden={!open} id={target ? undefined : "gantt-quick-task"}>
      <TaskQuickCreate
        projectId={projectId}
        gantt
        label="タスク名"
        focusOnOpen={open}
        initialValues={{
          ...defaultTaskFormValues,
          phaseAssignment: target?.phaseAssignment ?? "unclassified",
          parentTaskId: target?.parentTaskId?.toString() ?? "",
        }}
        submitTask={(values) =>
          createTask(values, { navigateAfterCreate: false })
        }
        isPending={isPending}
        error={error}
        onCreated={onCreated}
        actions={
          target
            ? undefined
            : (task) => (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(planning.pendingDraft)}
                  onClick={(event) =>
                    planning.openEditor(task, event.currentTarget)
                  }
                >
                  追加したタスクの担当・予定を編集
                </Button>
              )
        }
      />
    </div>
  );
}

export function GanttContextTaskButton({
  target,
  projectId,
  planning,
  onCreated,
}: {
  target: GanttTaskCreateTarget;
  projectId: number;
  planning: TaskPlanningController;
  onCreated: (task: TaskRead) => void;
}) {
  const [open, setOpen] = useState(false);
  const action = target.parentTaskId ? "子タスクを追加" : "タスクを追加";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7 shrink-0"
          aria-label={`「${target.label}」に${action}`}
          title={action}
        >
          <PlusIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(21rem,calc(100vw-2rem))]"
        aria-label={`「${target.label}」に${action}`}
      >
        <p className="mb-2 text-xs text-muted-foreground">
          {target.label} に{action}
        </p>
        {open ? (
          <GanttQuickTask
            projectId={projectId}
            planning={planning}
            target={target}
            open
            onCreated={(task) => {
              setOpen(false);
              onCreated(task);
            }}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

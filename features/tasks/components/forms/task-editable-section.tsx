"use client";
import { type ReactNode, useRef, useState } from "react";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TaskRead } from "@/lib/api/generated/model";
import { useUpdateTask } from "../../hooks/use-update-task";
import {
  getTaskFormValues,
  taskSectionValues,
  type TaskEditSection,
} from "../../lib/task-mappers";
import { TaskForm } from "./task-form";

export function TaskEditableSection({
  task,
  section,
  label,
  canUpdate,
  children,
}: {
  task: TaskRead;
  section: TaskEditSection;
  label: string;
  canUpdate: boolean;
  children?: ReactNode;
}) {
  const [baseline, setBaseline] = useState<TaskRead | null>(null);
  const editor = useUpdateTask(task.project_id, task.id);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {
    setBaseline(null);
    editor.resetConflict();
    requestAnimationFrame(() =>
      trigger.current?.focus({ preventScroll: true }),
    );
  };
  if (baseline && canUpdate) {
    const current = editor.conflictCurrent;
    return (
      <div
        className={
          section === "status" || section === "priority"
            ? "w-full min-w-0 max-w-md flex-none"
            : "w-full min-w-0"
        }
      >
        <TaskForm
          fullWidth
          mode="update"
          section={section}
          projectId={task.project_id}
          currentTaskId={task.id}
          initialValues={getTaskFormValues(baseline)}
          isPending={editor.isPending}
          error={editor.error}
          onCancel={close}
          onSuccess={close}
          conflictValues={current ? getTaskFormValues(current) : null}
          onCloseConflict={editor.resetConflict}
          onSubmit={(values, saved) =>
            editor.updateTask(
              taskSectionValues(section, baseline, values),
              baseline.version,
              baseline,
              saved,
            )
          }
          onResolveConflict={
            current
              ? (values, saved) => {
                  setBaseline(current);
                  return editor.updateTask(
                    taskSectionValues(section, current, values),
                    current.version,
                    current,
                    saved,
                  );
                }
              : undefined
          }
        />
      </div>
    );
  }
  if (section === "title")
    return (
      <h1 className="text-2xl font-semibold tracking-tight break-words">
        {canUpdate ? (
          <button
            type="button"
            ref={trigger}
            aria-label={task.title + "・" + label}
            className="text-left hover:underline"
            onClick={() => setBaseline(task)}
          >
            {task.title}{" "}
            <PencilIcon className="inline size-4 text-muted-foreground" />
          </button>
        ) : (
          task.title
        )}
      </h1>
    );
  if (
    section === "status" ||
    section === "priority" ||
    section === "assignee"
  ) {
    return canUpdate ? (
      <button
        ref={trigger}
        type="button"
        title={label}
        aria-label={label}
        className="inline-flex w-fit items-center gap-1 text-left hover:underline"
        onClick={() => setBaseline(task)}
      >
        {children}
        <PencilIcon aria-hidden className="size-3 text-muted-foreground" />
      </button>
    ) : (
      children
    );
  }
  return (
    <>
      {children}
      {canUpdate && (
        <Button
          ref={trigger}
          variant="ghost"
          size="sm"
          type="button"
          className="w-fit"
          onClick={() => setBaseline(task)}
        >
          <PencilIcon />
          {label}
        </Button>
      )}
    </>
  );
}

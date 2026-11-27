"use client";
import { type ReactNode, useId, useRef, useState } from "react";
import { PencilIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TaskRead } from "@/lib/api/generated/model";
import { useUpdateTask } from "../../hooks/use-update-task";
import {
  getTaskFormValues,
  taskSectionValues,
  type TaskEditSection,
} from "../../lib/task-mappers";
import { TaskForm } from "./task-form";

const valueButtonClass =
  "max-w-full cursor-pointer rounded px-1 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-2 focus-visible:outline-ring";

export function TaskEditableSection({
  task,
  section,
  label,
  canUpdate,
  children,
  heading,
  headingEditDisabled,
  presentation = "inline",
}: {
  task: TaskRead;
  section: TaskEditSection;
  label: string;
  canUpdate: boolean;
  children?: ReactNode;
  heading?: string;
  headingEditDisabled?: boolean;
  presentation?: "inline" | "popover";
}) {
  const [baseline, setBaseline] = useState<TaskRead | null>(null);
  const editor = useUpdateTask(task.project_id, task.id);
  const trigger = useRef<HTMLButtonElement>(null);
  const valueId = useId();
  const close = (restoreFocus = true) => {
    // 成功・取消後に元の編集操作へフォーカスを戻す。
    setBaseline(null);
    editor.resetConflict();
    if (restoreFocus) {
      requestAnimationFrame(() =>
        trigger.current?.focus({ preventScroll: true }),
      );
    }
  };
  const form = (() => {
    if (!baseline || !canUpdate) return null;
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
  })();
  if (presentation === "popover" && canUpdate) {
    return (
      <Popover
        open={Boolean(baseline)}
        onOpenChange={(open) => {
          if (open) setBaseline(task);
          else if (!editor.isPending) close(false);
        }}
      >
        <PopoverTrigger asChild>
          <button
            ref={trigger}
            type="button"
            className={cn(valueButtonClass, "inline-flex min-h-8 items-center")}
            aria-label={`${task.title}の${label}`}
            aria-describedby={valueId}
          >
            <span id={valueId} className="min-w-0">
              {children}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          aria-label={label}
          className="max-w-[calc(100vw-2rem)] p-3"
        >
          {form}
        </PopoverContent>
      </Popover>
    );
  }
  if (heading) {
    return (
      <>
        <div className="flex min-h-7 items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{heading}</h2>
          {canUpdate && !form && (
            <Button
              ref={trigger}
              variant="ghost"
              size="icon-sm"
              type="button"
              className="shrink-0 text-muted-foreground"
              aria-label={label}
              title={label}
              disabled={headingEditDisabled}
              onClick={() => setBaseline(task)}
            >
              <PencilIcon aria-hidden />
            </Button>
          )}
        </div>
        {form ?? children}
      </>
    );
  }
  if (form) return form;
  if (section === "title")
    return (
      <h1 className="text-2xl font-semibold tracking-tight break-words">
        {canUpdate ? (
          <button
            type="button"
            ref={trigger}
            aria-label={task.title + "・" + label}
            className={cn(valueButtonClass, "-ml-1 break-words")}
            onClick={() => setBaseline(task)}
          >
            {task.title}
          </button>
        ) : (
          task.title
        )}
      </h1>
    );
  if (
    section === "status" ||
    section === "priority" ||
    section === "assignee" ||
    section === "reporter" ||
    section === "type" ||
    section === "startDate" ||
    section === "dueDate" ||
    section === "progress"
  ) {
    return canUpdate ? (
      <button
        ref={trigger}
        type="button"
        title={label}
        aria-label={label}
        aria-describedby={valueId}
        className={cn(
          valueButtonClass,
          "-ml-1 inline-flex min-h-7 items-center",
        )}
        onClick={() => setBaseline(task)}
      >
        <span id={valueId} className="min-w-0">
          {children}
        </span>
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
          {label}
        </Button>
      )}
    </>
  );
}

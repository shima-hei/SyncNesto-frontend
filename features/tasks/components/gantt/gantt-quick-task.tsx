"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PlusIcon } from "lucide-react";

import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
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
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [created, setCreated] = useState<TaskRead | null>(null);
  const { createTask, error, isPending } = useCreateTask(projectId);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const submit = async () => {
    if (inFlight.current || !title.trim()) return;
    inFlight.current = true;
    try {
      const saved = await createTask(
        {
          ...defaultTaskFormValues,
          title,
          description,
          phaseAssignment:
            target?.phaseAssignment ?? defaultTaskFormValues.phaseAssignment,
          parentTaskId: target?.parentTaskId?.toString() ?? "",
        },
        { navigateAfterCreate: false },
      );
      setTitle("");
      setDescription("");
      setCreated(saved);
      onCreated?.(saved);
      input.current?.focus();
    } catch {
      // リクエスト失敗時は入力を保持する。
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <div
      hidden={!open}
      id={target ? undefined : "gantt-quick-task"}
      className={target ? "space-y-2" : "space-y-2 rounded-lg border p-3"}
    >
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex flex-wrap items-end gap-2">
          <Field className="min-w-0 flex-1 basis-48 gap-1">
            <FieldLabel htmlFor={`${id}-title`}>タスク名</FieldLabel>
            <Input
              id={`${id}-title`}
              ref={input}
              value={title}
              required
              autoComplete="off"
              readOnly={isPending}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                if (
                  event.nativeEvent.isComposing ||
                  event.nativeEvent.keyCode === 229
                )
                  event.preventDefault();
              }}
            />
          </Field>
          <Button type="submit" disabled={isPending || !title.trim()}>
            {isPending ? "登録中…" : "登録"}
          </Button>
        </div>
        <details>
          <summary className="cursor-pointer text-xs text-muted-foreground">
            メモを追加（任意）
          </summary>
          <Field className="mt-2">
            <FieldLabel htmlFor={`${id}-memo`}>メモ</FieldLabel>
            <Textarea
              id={`${id}-memo`}
              rows={2}
              value={description}
              readOnly={isPending}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
        </details>
        <FormApiError error={error} />
      </form>
      <div role="status" className="text-sm empty:sr-only">
        {created ? (
          <span>
            {created.task_code}「{created.title}」を未日程で登録しました。
          </span>
        ) : null}
      </div>
      {created && !target ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={Boolean(planning.pendingDraft)}
          onClick={(event) => planning.openEditor(created, event.currentTarget)}
        >
          追加したタスクの担当・予定を編集
        </Button>
      ) : null}
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

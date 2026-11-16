"use client";

import { useEffect, useId, useRef, useState } from "react";

import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TaskRead } from "@/lib/api/generated/model";

import { useCreateTask } from "../../hooks/use-create-task";
import type { TaskPlanningController } from "../../hooks/use-task-planning";
import { defaultTaskFormValues } from "../../lib/task-mappers";

export function GanttQuickTask({
  projectId,
  planning,
  open,
}: {
  projectId: number;
  planning: TaskPlanningController;
  open: boolean;
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
        { ...defaultTaskFormValues, title, description },
        { navigateAfterCreate: false },
      );
      setTitle("");
      setDescription("");
      setCreated(saved);
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
      id="gantt-quick-task"
      className="space-y-2 rounded-lg border p-3"
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
      {created ? (
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

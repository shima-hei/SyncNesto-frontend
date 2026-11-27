"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { isVersionConflictError } from "@/lib/api/conflict";
import type { TaskRead } from "@/lib/api/generated/model";
import { useUpdateTask } from "../../hooks/use-update-task";
import { invalidateTaskDetail } from "../../lib/task-cache";
import { TaskEditableSection } from "../forms/task-editable-section";

export function TaskDescriptionSection({
  task,
  canUpdate,
}: {
  task: TaskRead;
  canUpdate: boolean;
}) {
  const queryClient = useQueryClient();
  const { updateTaskDescription } = useUpdateTask(task.project_id, task.id);
  const saving = useRef(false);
  const [pendingDescription, setPendingDescription] = useState<string | null>(
    null,
  );
  const description = task.description ?? "";
  const busy = pendingDescription !== null;

  async function saveChecklist(next: string) {
    if (!canUpdate || saving.current || next === description) return;
    saving.current = true;
    setPendingDescription(next);
    try {
      await updateTaskDescription(next, task.version);
    } catch (error) {
      if (isVersionConflictError(error)) {
        await invalidateTaskDetail(queryClient, task.id);
      }
    } finally {
      saving.current = false;
      setPendingDescription(null);
    }
  }

  return (
    <section className="min-w-0 space-y-2">
      <TaskEditableSection
        task={task}
        section="description"
        heading="説明"
        label="説明を編集"
        canUpdate={canUpdate}
        headingEditDisabled={busy}
      >
        <MarkdownPreview
          value={pendingDescription ?? description}
          onChange={canUpdate ? saveChecklist : undefined}
          taskListBusy={busy}
          emptyMessage="説明はありません。"
          className="min-h-0 min-w-0 rounded-none border-0 bg-transparent p-0"
        />
        <p
          role="status"
          className="text-xs text-muted-foreground empty:sr-only"
        >
          {busy ? "チェックを保存中…" : ""}
        </p>
      </TaskEditableSection>
    </section>
  );
}

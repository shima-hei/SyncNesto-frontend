"use client";

import { useRef } from "react";
import { DraftRestoreDialog } from "@/components/shared/dialogs/draft-restore-dialog";
import { ConflictResolutionDialog } from "@/components/shared/dialogs/conflict-resolution-dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getTaskStatusLabel } from "../../constants/task-options";
import { getConflictFields } from "@/lib/api/conflict";
import { useReadTaskTasksTaskIdGet } from "@/lib/api/generated/tasks/tasks";
import type { TaskPlanningController } from "../../hooks/use-task-planning";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import {
  getTaskPlanningValues,
  mergePlanningValues,
  PLANNING_LABELS,
} from "../../lib/task-planning";
import {
  TaskPlanningActions,
  TaskPlanningFields,
} from "./task-planning-editor";

export function TaskPlanningWorkspace({
  planning,
  canUpdate,
}: {
  planning: TaskPlanningController;
  canUpdate: boolean;
}) {
  const focusFallback = useRef<HTMLDivElement>(null);
  const selected = planning.editorTask;
  const { getTaskUserLabel } = useTaskUserMap(planning.projectId);
  const query = useReadTaskTasksTaskIdGet(selected?.id ?? 0, {
    query: { enabled: Boolean(selected), retry: false },
  });
  const selectedTask =
    query.data?.project_id === selected?.project_id ? query.data : selected;
  const comparison = planning.comparison;
  return (
    <>
      <div
        ref={focusFallback}
        tabIndex={-1}
        aria-label="計画の保存状況"
        role="status"
        className="text-sm empty:sr-only"
      >
        {planning.lastSaved ? (
          <span key={planning.lastSaved.revision}>
            「{planning.lastSaved.task.title}」の計画を保存しました。
          </span>
        ) : null}
      </div>
      <DraftRestoreDialog
        open={Boolean(planning.pendingDraft)}
        updatedAt={planning.pendingDraft?.updatedAt}
        onRestore={planning.restore}
        onDiscard={planning.discardStored}
      />
      {planning.storageError ? (
        <Alert variant="destructive">
          <AlertTitle>下書きを端末に保存できません</AlertTitle>
          <AlertDescription>
            入力はこの画面に保持しています。移動前に行を保存するか、入力内容を控えてください。
          </AlertDescription>
        </Alert>
      ) : null}
      {Object.keys(planning.rows).length ? (
        <details
          className="rounded-lg border px-3 py-1.5"
          aria-label="編集中の計画"
        >
          <summary className="cursor-pointer text-sm font-medium">
            編集中の計画 {Object.keys(planning.rows).length}件
          </summary>
          <ul className="mt-2 flex flex-wrap gap-2">
            {Object.values(planning.rows).map((row) => (
              <li key={row.baseline.id}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto max-w-full whitespace-normal text-left"
                  onClick={(event) =>
                    planning.openEditor(row.baseline, event.currentTarget)
                  }
                >
                  {row.baseline.title} ·{" "}
                  {row.status === "pending"
                    ? "保存中"
                    : row.status === "unknown"
                      ? "結果不明"
                      : row.status === "conflict"
                        ? "要比較"
                        : "未保存"}
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) planning.closeEditor();
        }}
      >
        <SheetContent
          className="overflow-y-auto sm:max-w-xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (!planning.restoreEditorFocus())
              focusFallback.current?.focus({ preventScroll: true });
          }}
        >
          <SheetHeader>
            <SheetTitle>{selectedTask?.title ?? "計画を編集"}</SheetTitle>
            <SheetDescription>
              担当・進捗・予定日・見積を行単位で保存します。
            </SheetDescription>
          </SheetHeader>
          {selectedTask ? (
            <div className="flex flex-col gap-4 p-4">
              {query.isError ? (
                <p className="text-sm text-destructive">
                  最新情報を取得できません。保存には取得済みの版を使い、競合時は比較します。
                </p>
              ) : null}
              {canUpdate ? (
                <>
                  <TaskPlanningFields task={selectedTask} planning={planning} />
                  <p role="status" className="text-sm empty:sr-only">
                    {planning.lastSaved?.task.id === selectedTask.id &&
                    !planning.rows[selectedTask.id]
                      ? "この行の計画を保存しました。"
                      : null}
                  </p>
                  <TaskPlanningActions
                    task={selectedTask}
                    planning={planning}
                  />
                </>
              ) : (
                <p>更新権限がありません。編集中の入力は保持しています。</p>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
      {comparison ? (
        <ConflictResolutionDialog
          key={`${comparison.current.id}-${comparison.current.version}`}
          open
          fields={getConflictFields({
            original: getTaskPlanningValues(comparison.draft.baseline),
            local: comparison.draft.values,
            current: getTaskPlanningValues(comparison.current),
          })}
          localValues={mergePlanningValues(
            comparison.draft,
            comparison.current,
          )}
          currentValues={getTaskPlanningValues(comparison.current)}
          fieldLabels={PLANNING_LABELS}
          valueFormatters={{
            status: (value) => getTaskStatusLabel(String(value ?? "")),
            assigneeId: (value) =>
              getTaskUserLabel(value ? Number(value) : null),
          }}
          title="計画の入力と現在値を比較"
          description="元の値・自分の入力・現在値を確認してください。選択後も自動送信せず、行の保存で確定します。"
          submitLabel="選んだ値を編集へ戻す"
          onOpenChange={(open) => {
            if (!open) planning.closeComparison();
          }}
          onResolve={planning.resolveComparison}
        />
      ) : null}
    </>
  );
}

"use client";

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
        <section
          className="flex flex-col gap-2 rounded-lg border p-3"
          aria-label="編集中の計画"
        >
          <h2 className="text-sm font-medium">
            編集中の計画 {Object.keys(planning.rows).length}件
          </h2>
          <p className="text-sm text-muted-foreground">
            ドラッグも未保存の編集です。各行で保存してください。絞り込み外・未配置の行もここから開けます。
          </p>
          <ul className="flex flex-wrap gap-2">
            {Object.values(planning.rows).map((row) => (
              <li key={row.baseline.id}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto max-w-full whitespace-normal text-left"
                  onClick={() => planning.openEditor(row.baseline)}
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
        </section>
      ) : null}
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) planning.closeEditor();
        }}
      >
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{selectedTask?.title ?? "計画を編集"}</SheetTitle>
            <SheetDescription>
              担当・予定日・見積入力だけを更新します。実績・状態・工数の根拠は変わりません。
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

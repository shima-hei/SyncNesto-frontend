"use client";

import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { getTaskStatusLabel } from "../../constants/task-options";
import {
  LIST_EDIT_FIELDS,
  getListEditValues,
  listEditChanges,
  type ListEditValues,
} from "../../lib/task-list-edit";
import type { TaskListEditingController } from "../../hooks/use-task-list-editing";
import { useTaskUserMap } from "../../hooks/use-task-user-map";

export function TaskListEditDialogs({
  projectId,
  editor,
}: {
  projectId: number;
  editor: TaskListEditingController;
}) {
  const { usersById } = useTaskUserMap(projectId);
  const comparison = editor.comparison;
  const label = (field: keyof ListEditValues, value: string) =>
    field === "status"
      ? getTaskStatusLabel(value)
      : field === "assigneeId"
        ? value
          ? (usersById.get(Number(value))?.name ?? "担当者を確認できません")
          : "未割当"
        : value || "未設定";
  return (
    <>
      <ConfirmDialog
        open={Boolean(editor.pendingAction)}
        onOpenChange={(open) => {
          if (!open) editor.cancelNavigation();
        }}
        title="未保存の変更があります"
        description="入力はまだ保存していません。破棄して移動しますか？"
        confirmLabel="破棄して移動"
        cancelLabel="編集を続ける"
        onConfirm={editor.discardAndNavigate}
      />
      <Dialog
        open={Boolean(comparison)}
        onOpenChange={(open) => {
          if (!open) editor.closeComparison();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>最新のタスクと入力を比較</DialogTitle>
            <DialogDescription>
              入力を保持しています。元の値と最新の内容を比較し、自分が変更した項目だけ再適用できます。
            </DialogDescription>
          </DialogHeader>
          {comparison ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>項目</TableHead>
                  <TableHead>元の値</TableHead>
                  <TableHead>最新</TableHead>
                  <TableHead>入力</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {LIST_EDIT_FIELDS.map((field) => (
                  <TableRow key={field}>
                    <TableCell>
                      {
                        { status: "状態", assigneeId: "担当", dueDate: "期限" }[
                          field
                        ]
                      }
                      {listEditChanges(comparison.draft).includes(field)
                        ? "（変更）"
                        : ""}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {label(
                        field,
                        getListEditValues(comparison.draft.baseline)[field],
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {label(
                        field,
                        getListEditValues(comparison.current)[field],
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {label(field, comparison.draft.values[field])}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={editor.closeComparison}>
              入力を保持して閉じる
            </Button>
            <Button variant="outline" onClick={editor.useCurrent}>
              最新の内容で編集し直す
            </Button>
            <Button onClick={() => void editor.reapply()}>
              入力した変更だけ再適用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

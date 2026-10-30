"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { TaskRead } from "@/lib/api/generated/model";
import { TASK_STATUS_OPTIONS } from "../../constants/task-options";
import { getListEditValues, listEditChanges } from "../../lib/task-list-edit";
import type { TaskListEditingController } from "../../hooks/use-task-list-editing";
import { TaskUserSelectField } from "../forms/task-user-select-field";

export function TaskListDraftNotice({
  editor,
}: {
  editor: TaskListEditingController;
}) {
  return (
    <>
      {editor.pendingDraft ? (
        <Alert>
          <AlertTitle>未保存の入力があります</AlertTitle>
          <AlertDescription>
            <p>
              この一覧で入力した内容を復元できます。保存結果が不明なものは最新値を確認してから再操作します。
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={editor.restore}>
                下書きを復元
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={editor.discardStored}
              >
                下書きを破棄
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
      {editor.storageError ? (
        <Alert variant="destructive">
          <AlertDescription>
            端末へ下書きを保存できません。画面内の入力は保持しています。
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}

export function TaskListQuickEdit({
  projectId,
  task,
  editor,
}: {
  projectId: number;
  task: TaskRead;
  editor: TaskListEditingController;
}) {
  const row = editor.rows[task.id];
  const values = row?.values ?? getListEditValues(task);
  const dirty = row ? listEditChanges(row) : [];
  const pending = row?.status === "pending" || editor.checking;
  const blocked = row?.status === "unknown" || row?.status === "conflict";
  const disabled = pending || blocked || Boolean(editor.pendingDraft);
  return (
    <form
      aria-label="タスクの軽微編集"
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void editor.save(task);
      }}
    >
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel htmlFor={`task-list-status-${task.id}`}>状態</FieldLabel>
          <Select
            value={values.status}
            disabled={disabled}
            onValueChange={(status) => editor.edit(task, { status })}
          >
            <SelectTrigger
              id={`task-list-status-${task.id}`}
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {!TASK_STATUS_OPTIONS.some(
                  (option) => option.value === values.status,
                ) ? (
                  <SelectItem value={values.status}>{values.status}</SelectItem>
                ) : null}
                {TASK_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <TaskUserSelectField
          projectId={projectId}
          label="担当者"
          value={values.assigneeId}
          placeholder="未割当"
          disabled={disabled}
          onChange={(assigneeId) => editor.edit(task, { assigneeId })}
        />
        <Field>
          <FieldLabel htmlFor={`task-list-due-${task.id}`}>期限</FieldLabel>
          <Input
            id={`task-list-due-${task.id}`}
            type="date"
            value={values.dueDate}
            disabled={disabled}
            onChange={(event) =>
              editor.edit(task, { dueDate: event.target.value })
            }
          />
        </Field>
      </FieldGroup>
      {dirty.includes("status") &&
      ["done", "in_progress"].includes(values.status) ? (
        <p className="text-xs text-muted-foreground">
          状態を変更すると、既存のルールに従って進捗・実績日が補完されます。完了は進捗100%になります。
        </p>
      ) : null}
      <p role="status" className="text-xs text-muted-foreground">
        {dirty.length ? `${dirty.length}項目が未保存です` : "変更はありません"}
      </p>
      {row?.message ? (
        <Alert variant="destructive">
          <AlertDescription>{row.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={!dirty.length || disabled}>
          {pending ? "保存結果を確認中…" : "変更を保存"}
        </Button>
        {!blocked ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!dirty.length || pending}
            onClick={() => editor.discard(task.id)}
          >
            入力を元に戻す
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => void editor.confirm(task.id)}
          >
            最新の値を確認
          </Button>
        )}
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  canCommentTask,
  canUpdateTask,
} from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { formatDate, formatDateTime } from "@/lib/format/date";
import type { TaskRead } from "@/lib/api/generated/model";

import { useTask } from "../../hooks/use-task";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { useUpdateTaskQuick } from "../../hooks/use-update-task-quick";
import { TaskUserSelectField } from "../forms/task-user-select-field";
import {
  TaskFlagBadges,
  TaskPriorityBadge,
  TaskRequirementBadges,
  TaskStatusBadge,
  TaskTags,
  TaskTypeBadge,
} from "../shared/task-badges";
import { TaskCommentsSection } from "./task-comments-section";

type TaskDetailSheetProps = {
  projectId: number;
  taskId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TaskDetailSheet({
  projectId,
  taskId,
  open,
  onOpenChange,
}: TaskDetailSheetProps) {
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const { getTaskUserLabel } = useTaskUserMap(projectId);
  const { task, isLoading, error } = useTask(open ? taskId : null);
  const { task: parentTask } = useTask(open ? task?.parent_task_id : null);
  const canComment = canCommentTask(currentProjectRole);
  const canUpdate = canUpdateTask(currentProjectRole);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(96vw,720px)] gap-0 overflow-hidden p-0 sm:max-w-none">
        {isLoading ? (
          <>
            <SheetHeader className="border-b p-4 pr-14">
              <SheetTitle>タスク詳細</SheetTitle>
              <SheetDescription>タスクを読み込み中です。</SheetDescription>
            </SheetHeader>
            <TaskDetailSheetSkeleton />
          </>
        ) : error || !task ? (
          <>
            <SheetHeader className="border-b p-4 pr-14">
              <SheetTitle>タスク詳細</SheetTitle>
              <SheetDescription>タスクを取得できませんでした。</SheetDescription>
            </SheetHeader>
            <div className="p-6 text-sm text-muted-foreground">
              タスクを取得できませんでした。
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="border-b p-4 pr-14">
              <div className="flex min-w-0 flex-col gap-2">
                <SheetDescription>{task.task_code}</SheetDescription>
                <SheetTitle className="truncate">{task.title}</SheetTitle>
                <div className="flex flex-wrap gap-2">
                  <TaskTypeBadge type={task.task_type} />
                  <TaskStatusBadge status={task.status} />
                  <TaskPriorityBadge priority={task.priority} />
                  <TaskFlagBadges
                    isOverdue={task.is_overdue}
                    isBlocked={task.is_blocked}
                  />
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/projects/joined/${projectId}/tasks/${task.id}`}>
                  <ExternalLinkIcon data-icon="inline-start" />
                  詳細ページ
                </Link>
              </Button>
            </SheetHeader>
            <Tabs
              defaultValue="overview"
              className="min-h-0 flex-1 overflow-hidden p-4"
            >
              <TabsList>
                <TabsTrigger value="overview">概要</TabsTrigger>
                <TabsTrigger value="comments">コメント</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="min-h-0 overflow-y-auto">
                <TaskSheetOverview
                  projectId={projectId}
                  task={task}
                  parentTask={parentTask}
                  canUpdate={canUpdate}
                  assigneeLabel={getTaskUserLabel(task.assignee_id)}
                  reporterLabel={getTaskUserLabel(task.reporter_id)}
                />
              </TabsContent>
              <TabsContent value="comments" className="min-h-0 overflow-hidden">
                <TaskCommentsSection
                  projectId={projectId}
                  task={task}
                  taskId={task.id}
                  canComment={canComment}
                  canUpdateStatus={canUpdate}
                  className="flex h-full flex-col border-0 shadow-none"
                  contentClassName="max-h-none min-h-0 flex-1"
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TaskSheetOverview({
  projectId,
  task,
  parentTask,
  canUpdate,
  assigneeLabel,
  reporterLabel,
}: {
  projectId: number;
  task: TaskRead;
  parentTask: TaskRead | null;
  canUpdate: boolean;
  assigneeLabel: string;
  reporterLabel: string;
}) {
  return (
    <div className="flex flex-col gap-4 pb-4">
      {canUpdate ? (
        <TaskSheetQuickEdit
          key={`${task.id}-${task.version}`}
          projectId={projectId}
          task={task}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>説明</CardTitle>
        </CardHeader>
        <CardContent>
          <MarkdownPreview
            value={task.description ?? ""}
            emptyMessage="説明はありません。"
            className="min-h-24"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TaskInfo label="担当者" value={assigneeLabel} />
          <TaskInfo label="報告者" value={reporterLabel} />
          <TaskInfo label="開始日" value={formatDate(task.start_date)} />
          <TaskInfo label="終了予定日" value={formatDate(task.due_date)} />
          <TaskInfo
            label="実績開始日"
            value={formatDate(task.actual_start_date)}
          />
          <TaskInfo
            label="実績終了日"
            value={formatDate(task.actual_end_date)}
          />
          <TaskInfo label="進捗率" value={`${task.progress_percent ?? 0}%`} />
          <TaskInfo
            label="見積/実績"
            value={`${task.estimated_minutes ?? "-"} / ${
              task.actual_minutes ?? "-"
            } 分`}
          />
          <TaskInfo
            label="親タスク"
            value={getTaskReferenceLabel(parentTask, task.parent_task_id)}
          />
          <TaskInfo label="更新日時" value={formatDateTime(task.updated_at)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>関連要件・タグ</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">関連要件</span>
            <TaskRequirementBadges requirements={task.requirements} />
            {!task.requirements?.length ? (
              <span className="text-sm text-muted-foreground">
                関連要件はありません。
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">タグ</span>
            <TaskTags tags={task.tags} />
            {!task.tags?.length ? (
              <span className="text-sm text-muted-foreground">
                タグはありません。
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TaskSheetQuickEdit({
  projectId,
  task,
}: {
  projectId: number;
  task: TaskRead;
}) {
  const [assigneeId, setAssigneeId] = useState(
    task.assignee_id ? String(task.assignee_id) : ""
  );
  const [startDate, setStartDate] = useState(task.start_date ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const { updateTaskQuick, isPending } = useUpdateTaskQuick(projectId);
  const isDirty =
    assigneeId !== (task.assignee_id ? String(task.assignee_id) : "") ||
    startDate !== (task.start_date ?? "") ||
    dueDate !== (task.due_date ?? "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>クイック編集</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <TaskUserSelectField
          projectId={projectId}
          label="担当者"
          value={assigneeId}
          placeholder="未設定"
          disabled={isPending}
          onChange={setAssigneeId}
        />
        <Field>
          <FieldLabel htmlFor={`task-${task.id}-sheet-start-date`}>
            開始日
          </FieldLabel>
          <Input
            id={`task-${task.id}-sheet-start-date`}
            type="date"
            value={startDate}
            disabled={isPending}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`task-${task.id}-sheet-due-date`}>期限</FieldLabel>
          <Input
            id={`task-${task.id}-sheet-due-date`}
            type="date"
            value={dueDate}
            disabled={isPending}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </Field>
        <Button
          type="button"
          size="sm"
          className="self-start"
          disabled={!isDirty || isPending}
          onClick={() => {
            updateTaskQuick(task, { assigneeId, startDate, dueDate }).catch(
              () => undefined
            );
          }}
        >
          保存
        </Button>
      </CardContent>
    </Card>
  );
}

function TaskInfo({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function TaskDetailSheetSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-52 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

const getTaskReferenceLabel = (
  task: TaskRead | null,
  fallbackTaskId?: number | null
) => {
  if (task) {
    return `${task.task_code} ${task.title}`;
  }

  return fallbackTaskId ? `タスクID: ${fallbackTaskId}` : "-";
};

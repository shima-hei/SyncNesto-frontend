"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { canCreateTask } from "@/features/auth/utils/authorization";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { getTaskStatusLabel } from "@/features/tasks/constants/task-options";
import { TaskForm } from "@/features/tasks/components/forms/task-form";
import {
  defaultTaskFormValues,
  toTaskCreate,
} from "@/features/tasks/lib/task-mappers";
import type { TaskFormValues } from "@/features/tasks/types/task-form";
import { listTestExecutionsProjectsProjectIdTestDesignsDesignIdCasesCaseIdExecutionsGet as listExecutions } from "@/lib/api/generated/test-collaboration/test-collaboration";
import {
  linkCaseIssueProjectsProjectIdTestDesignsDesignIdCasesCaseIdIssuesPost as linkIssue,
  listCaseIssuesProjectsProjectIdTestDesignsDesignIdCasesCaseIdIssuesGet as listIssues,
  unlinkCaseIssueProjectsProjectIdTestDesignsDesignIdCasesCaseIdIssuesLinkIdDelete as unlinkIssue,
} from "@/lib/api/generated/test-issues/test-issues";
import {
  createTaskProjectsProjectIdTasksPost as createTask,
  listTasksProjectsProjectIdTasksGet as listTasks,
} from "@/lib/api/generated/tasks/tasks";
import type { TestCaseRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";
import { useConfirmAction } from "../../hooks/use-confirm-action";
import type { CaseSource } from "../../lib/case-diff";

export function CaseIssues({
  projectId,
  designId,
  testCase,
  source,
  editable,
}: {
  projectId: number;
  designId: number;
  testCase: TestCaseRead;
  source: CaseSource;
  editable: boolean;
}) {
  const client = useQueryClient();
  const { user } = useAuth();
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const { confirm, confirmDialogProps } = useConfirmAction();
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [createdTask, setCreatedTask] = useState<{
    id: number;
    task_code: string;
  } | null>(null);
  const key = ["case-issues", projectId, designId, testCase.id];
  const issues = useQuery({
    queryKey: key,
    queryFn: () => listIssues(projectId, designId, testCase.id),
  });
  const executions = useQuery({
    queryKey: [
      "test-executions",
      projectId,
      designId,
      testCase.id,
      testCase.version,
    ],
    queryFn: () => listExecutions(projectId, designId, testCase.id),
  });
  const candidates = useQuery({
    queryKey: ["bug-task-candidates", projectId, search],
    queryFn: () =>
      listTasks(projectId, {
        page: 1,
        page_size: 100,
        task_type: "bug",
        q: search.trim() || undefined,
      }),
    enabled: searchOpen,
  });
  const latest = executions.data?.[0];
  const canCreate = editable && canCreateTask(currentProjectRole);
  const pattern = source.pattern ? ` ${source.pattern.code}` : "";
  const contextText = [
    `テスト項目: ${source.item.code}${pattern}`,
    `対象画面・機能: ${source.item.target_feature || "－"}`,
    `テスト内容: ${source.item.content || "－"}`,
    `実行結果: ${testCase.actual_result || "－"}`,
    `実行日時: ${latest ? formatDateTime(latest.executed_at) : "－"}`,
    `実行者: ${latest?.executed_by_name || "－"}`,
  ].join("\n");
  const initialValues: TaskFormValues = {
    ...defaultTaskFormValues,
    title: `[${source.item.code}${pattern}] ${source.item.content || "不具合"}`,
    description: contextText,
    taskType: "bug",
    status: "backlog",
    reporterId: user?.id ? String(user.id) : "",
  };
  async function refresh() {
    await client.invalidateQueries({ queryKey: key });
    await client.invalidateQueries({
      queryKey: ["design-issues", projectId, designId],
    });
    await client.invalidateQueries({
      queryKey: ["test-progress", projectId, designId],
    });
    await client.invalidateQueries({
      queryKey: ["issue-test-cases", projectId],
    });
  }
  async function attach(taskId: number) {
    setBusy(true);
    try {
      await linkIssue(projectId, designId, testCase.id, {
        task_id: taskId,
        origin_execution_id: latest?.id ?? null,
      });
      await refresh();
      setSearchOpen(false);
      toast.success("Issueを紐付けました");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "紐付けられませんでした",
      );
      throw error;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">
          関連Issue {issues.data?.length ?? 0}件
        </h3>
        {editable && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSearchOpen(true)}
            >
              既存Issueを紐付け
            </Button>
            {canCreate && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                Issueを作成
              </Button>
            )}
          </div>
        )}
      </div>
      {issues.isLoading && <p className="text-sm">読み込み中…</p>}
      {issues.error && (
        <p role="alert" className="text-sm">
          Issueを読み込めませんでした。
        </p>
      )}
      {issues.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          関連Issueはありません。NGでもIssue作成は必須ではありません。
        </p>
      )}
      {issues.data?.map((issue) => (
        <div
          key={issue.id}
          className="flex flex-wrap items-center gap-3 rounded border p-3 text-sm"
        >
          <Link
            href={`/projects/joined/${projectId}/tasks/${issue.task_id}`}
            className="font-medium underline"
          >
            {issue.task_code} {issue.title}
          </Link>
          <span>{getTaskStatusLabel(issue.status)}</span>
          {issue.origin_execution_id && (
            <button
              type="button"
              className="underline"
              onClick={() =>
                document
                  .getElementById(`test-execution-${issue.origin_execution_id}`)
                  ?.scrollIntoView({ block: "center" })
              }
            >
              起票元の実行を見る
            </button>
          )}
          {editable && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                confirm({
                  title: "Issueの紐付けを解除しますか？",
                  description: `${issue.task_code} のタスク本体は削除されません。`,
                  confirmLabel: "紐付けを解除",
                  onConfirm: async () => {
                    setBusy(true);
                    try {
                      await unlinkIssue(
                        projectId,
                        designId,
                        testCase.id,
                        issue.id,
                      );
                      await refresh();
                    } finally {
                      setBusy(false);
                    }
                  },
                })
              }
            >
              解除
            </Button>
          )}
        </div>
      ))}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>既存Issueを紐付け</DialogTitle>
            <DialogDescription>
              同じプロジェクトの不具合タスクを検索します。
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label="Issueを検索"
            placeholder="ID・タイトルで検索"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {candidates.isLoading && <p>検索中…</p>}
          {candidates.error && (
            <p role="alert">Issueを検索できませんでした。</p>
          )}
          <div className="max-h-80 space-y-2 overflow-auto">
            {candidates.data?.items
              .filter(
                (task) =>
                  !issues.data?.some((issue) => issue.task_id === task.id),
              )
              .map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 rounded border p-2 text-sm"
                >
                  <span>
                    {task.task_code} {task.title} ·{" "}
                    {getTaskStatusLabel(task.status)}
                  </span>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void attach(task.id).catch(() => undefined)}
                  >
                    紐付け
                  </Button>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCreatedTask(null);
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[min(96vw,1280px)] overflow-y-auto p-6 sm:max-w-none">
          <DialogHeader>
            <DialogTitle>Issueを作成</DialogTitle>
            <DialogDescription>
              テスト内容と最新の実行情報を初期入力しています。作成後にこのケースへ紐付けます。
            </DialogDescription>
          </DialogHeader>
          {createdTask && (
            <p role="status" className="rounded border p-2 text-sm">
              {createdTask.task_code}{" "}
              は作成済みです。再送信すると紐付けだけを再試行します。
            </p>
          )}
          <TaskForm
            key={testCase.id}
            mode="create"
            projectId={projectId}
            fullWidth
            initialValues={initialValues}
            isPending={busy}
            onSubmit={async (values) => {
              setBusy(true);
              try {
                const created =
                  createdTask ??
                  (await createTask(projectId, {
                    ...toTaskCreate(values),
                    task_type: "bug",
                  }));
                if (!createdTask) {
                  setCreatedTask({
                    id: created.id,
                    task_code: created.task_code,
                  });
                }
                await linkIssue(projectId, designId, testCase.id, {
                  task_id: created.id,
                  origin_execution_id: latest?.id ?? null,
                });
                await refresh();
                setCreatedTask(null);
                setCreateOpen(false);
                toast.success("Issueを作成して紐付けました");
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Issueを作成できませんでした",
                );
                throw error;
              } finally {
                setBusy(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>
      <ConfirmDialog {...confirmDialogProps} />
    </section>
  );
}

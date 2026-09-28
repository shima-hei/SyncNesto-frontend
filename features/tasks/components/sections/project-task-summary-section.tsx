"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format/date";

import { useTaskSummary } from "../../hooks/use-task-summary";

type ProjectTaskSummarySectionProps = {
  projectId: number;
};

export function ProjectTaskSummarySection({
  projectId,
}: ProjectTaskSummarySectionProps) {
  const {
    total,
    incompleteTotal,
    blockedTotal,
    overdueTotal,
    overdueTasks,
    upcomingDueTasks,
    isLoading,
    hasError,
  } = useTaskSummary(projectId);

  if (isLoading) {
    return <ProjectTaskSummarySkeleton />;
  }

  return (
    <section
      aria-labelledby="project-task-summary-title"
      className="flex min-w-0 flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="project-task-summary-title" className="text-base font-semibold">
          タスク状況
        </h2>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/projects/joined/${projectId}/tasks`}>
            すべてのタスク
            <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {hasError ? (
        <p role="alert" className="text-sm text-destructive">
          タスク状況を取得できませんでした。画面を再読み込みしてください。
        </p>
      ) : (
        <>
          <dl className="grid gap-x-6 gap-y-3 border-y py-4 sm:grid-cols-4">
            <SummaryMetric label="総数" value={total} emphasis="primary" />
            <SummaryMetric label="未完了" value={incompleteTotal} />
            <SummaryMetric
              label="期限超過"
              value={overdueTotal}
              emphasis="warning"
            />
            <SummaryMetric label="ブロック中" value={blockedTotal} />
          </dl>

          <div className="grid gap-6 lg:grid-cols-2">
            <TaskSummaryList
              projectId={projectId}
              title="期限超過タスク"
              tasks={overdueTasks}
            />
            <TaskSummaryList
              projectId={projectId}
              title="直近の期限タスク"
              tasks={upcomingDueTasks}
            />
          </div>
        </>
      )}
    </section>
  );
}

function SummaryMetric({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: "primary" | "warning";
}) {
  return (
    <div className="flex items-baseline gap-2 sm:flex-col sm:gap-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          emphasis === "warning" && value > 0
            ? "text-2xl font-semibold tabular-nums text-[var(--status-warning-fg)]"
            : emphasis === "primary"
              ? "text-2xl font-semibold tabular-nums"
              : "text-xl font-medium tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function TaskSummaryList({
  projectId,
  title,
  tasks,
}: {
  projectId: number;
  title: string;
  tasks: {
    id: number;
    task_code: string;
    title: string;
    due_date?: string | null;
  }[];
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {tasks.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タスク</TableHead>
              <TableHead className="w-28 text-right">期限</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="min-w-0 whitespace-normal">
                  <Link
                    href={`/projects/joined/${projectId}/tasks/${task.id}`}
                    className="inline-flex min-w-0 flex-wrap gap-x-2 rounded-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span className="text-muted-foreground">
                      {task.task_code}
                    </span>
                    <span className="break-words">{task.title}</span>
                  </Link>
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {formatDate(task.due_date)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState message="対象タスクはありません。" />
      )}
    </div>
  );
}

function ProjectTaskSummarySkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-label="タスク状況を読み込み中">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

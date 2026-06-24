"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
    statusCounts,
    isLoading,
  } = useTaskSummary(projectId);

  if (isLoading) {
    return <ProjectTaskSummarySkeleton />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <CardTitle>タスク状況</CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link href={`/projects/joined/${projectId}/tasks`}>
            タスクを開く
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetric label="総数" value={total} />
          <SummaryMetric label="未完了" value={incompleteTotal} />
          <SummaryMetric label="期限超過" value={overdueTotal} />
          <SummaryMetric label="ブロック中" value={blockedTotal} />
        </div>
        <div className="flex flex-wrap gap-2">
          {statusCounts.map((status) => (
            <Badge key={status.value} variant="secondary">
              {status.label}: {status.total}
            </Badge>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <TaskSummaryList title="期限超過タスク" tasks={overdueTasks} />
          <TaskSummaryList title="直近の期限タスク" tasks={upcomingDueTasks} />
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function TaskSummaryList({
  title,
  tasks,
}: {
  title: string;
  tasks: { id: number; task_code: string; title: string; due_date?: string | null }[];
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {tasks.length ? (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="grid gap-1 text-sm md:grid-cols-[120px_1fr_96px]"
            >
              <span className="text-muted-foreground">{task.task_code}</span>
              <span className="truncate">{task.title}</span>
              <span className="text-muted-foreground">
                {formatDate(task.due_date)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">対象タスクはありません。</p>
      )}
    </div>
  );
}

function ProjectTaskSummarySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { PageHeader } from "@/components/shared/layout/page-header";
import { NotificationSummary } from "@/components/shared/notifications/notification-summary";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectActivity } from "@/lib/api/generated/model";
import { useReadProjectOverviewProjectsProjectIdOverviewGet } from "@/lib/api/generated/projects/projects";
import { formatDate, formatDateTime } from "@/lib/format/date";

import { useProject } from "../../hooks/use-project";
import {
  activityDescription,
  activityHref,
  attentionHref,
  attentionKindLabel,
} from "../../lib/project-overview-links";

type JoinedProjectDetailPageProps = { projectId: number };

export function JoinedProjectDetailPage({
  projectId,
}: JoinedProjectDetailPageProps) {
  const { project, isLoading, error } = useProject(projectId);
  const overview = useReadProjectOverviewProjectsProjectIdOverviewGet(
    projectId,
    {
      query: { enabled: projectId > 0, retry: false },
    },
  );
  const base = `/projects/joined/${projectId}`;

  if (isLoading) return <JoinedProjectDetailSkeleton />;
  if (error || !project) {
    return (
      <p role="alert" className="text-sm text-destructive">
        プロジェクト情報を取得できませんでした。画面を再読み込みしてください。
      </p>
    );
  }

  const data = overview.data;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader title={project.name} description={project.project_code} />

      <section
        aria-label="プロジェクト基本情報"
        className="flex flex-col gap-3"
      >
        <p className="max-w-[80ch] text-sm leading-6 whitespace-pre-wrap break-words">
          {project.description || "説明は登録されていません。"}
        </p>
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          <ProjectInfo label="開始日" value={formatDate(project.start_date)} />
          <ProjectInfo label="終了日" value={formatDate(project.end_date)} />
          <ProjectInfo
            label="最終更新"
            value={formatDateTime(project.updated_at)}
          />
        </dl>
      </section>

      <Separator />

      <NotificationSummary projectId={projectId} />

      <Separator />

      {overview.isLoading ? (
        <div aria-label="プロジェクト状況を読み込み中" className="space-y-5">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : overview.error || !data ? (
        <DataLoadError
          resourceName="プロジェクト状況"
          onRetry={() => void overview.refetch()}
          isRetrying={overview.isFetching}
        />
      ) : (
        <>
          <section aria-labelledby="project-status-title" className="space-y-4">
            <h2 id="project-status-title" className="text-base font-semibold">
              プロジェクト状況
            </h2>
            <dl className="grid border-y sm:grid-cols-2 xl:grid-cols-4">
              {data.requirements && (
                <Metric
                  label="要件"
                  value={String(data.requirements.total)}
                  meaning="件"
                  detail={`テスト項目未紐付け ${data.requirements.uncovered}件`}
                  href={`${base}/requirements`}
                  alert={data.requirements.uncovered > 0}
                />
              )}
              {data.tasks && (
                <Metric
                  label="タスク"
                  value={`${data.tasks.done} / ${data.tasks.total}`}
                  meaning="完了"
                  detail={`期限超過 ${data.tasks.overdue}件`}
                  href={`${base}/tasks`}
                  alert={data.tasks.overdue > 0}
                />
              )}
              {data.tests && (
                <Metric
                  label="テスト"
                  value={`${data.tests.executed} / ${data.tests.total}`}
                  meaning="実施済み（OK・NG）"
                  detail={`NG ${data.tests.failed}件`}
                  href={`${base}/test-cases`}
                  alert={data.tests.failed > 0}
                  alertTone="danger"
                />
              )}
              {data.issues && (
                <Metric
                  label="Issue"
                  value={String(data.issues.total)}
                  meaning="登録済み"
                  detail={`未解決 ${data.issues.open}件`}
                  href={`${base}/tasks`}
                  alert={data.issues.open > 0}
                />
              )}
            </dl>
          </section>

          <section
            aria-labelledby="project-attention-title"
            className="space-y-3"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2
                id="project-attention-title"
                className="text-base font-semibold"
              >
                要対応
              </h2>
              <p className="text-xs text-muted-foreground">
                優先表示 {data.attention.length}件
              </p>
            </div>
            {data.attention.length === 0 ? (
              <p className="border-y py-5 text-sm text-muted-foreground">
                現在、対応が必要な項目はありません。
              </p>
            ) : (
              <div className="overflow-hidden border-y text-sm">
                <div className="hidden grid-cols-[8rem_9rem_minmax(0,1fr)_9rem] gap-3 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground md:grid">
                  <span>種別</span>
                  <span>ID</span>
                  <span>内容</span>
                  <span>状態</span>
                </div>
                {data.attention.map((item) => (
                  <Link
                    key={`${item.kind}:${item.target_id}`}
                    href={attentionHref(projectId, item)}
                    className="grid gap-x-3 gap-y-1 border-b px-3 py-3 transition-colors last:border-b-0 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring md:grid-cols-[8rem_9rem_minmax(0,1fr)_9rem] md:items-center"
                  >
                    <span className="text-xs text-muted-foreground md:text-sm">
                      {attentionKindLabel[item.kind] ?? "要対応"}
                    </span>
                    <span className="font-medium break-all">{item.code}</span>
                    <span className="min-w-0 break-words">{item.title}</span>
                    <span
                      className={`text-xs md:text-sm ${item.kind.startsWith("test_failed") ? "text-[var(--status-danger-fg)]" : "text-[var(--status-warning-fg)]"}`}
                    >
                      {item.state}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section
            aria-labelledby="project-activity-title"
            className="space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="project-activity-title"
                className="text-base font-semibold"
              >
                最近の動き
              </h2>
              <Link
                href={`${base}/activities`}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                すべて表示{" "}
                <ArrowUpRightIcon className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <ActivityRows projectId={projectId} items={data.activities} />
          </section>
        </>
      )}
    </div>
  );
}

export function ActivityRows({
  projectId,
  items,
}: {
  projectId: number;
  items: ProjectActivity[];
}) {
  if (items.length === 0) {
    return (
      <p className="border-y py-5 text-sm text-muted-foreground">
        最近の変更はありません。
      </p>
    );
  }
  return (
    <div className="border-y text-sm">
      {items.map((item, index) => (
        <Link
          key={`${item.kind}:${item.target_id}:${item.occurred_at}:${index}`}
          href={activityHref(projectId, item)}
          className="grid gap-x-4 gap-y-1 border-b px-3 py-3 transition-colors last:border-b-0 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring sm:grid-cols-[8rem_8rem_minmax(0,1fr)] sm:items-baseline"
        >
          <time
            dateTime={item.occurred_at}
            className="text-xs text-muted-foreground"
          >
            {formatDateTime(item.occurred_at)}
          </time>
          <span className="text-xs text-muted-foreground">
            {item.actor_name ?? "システム"}
          </span>
          <span className="min-w-0 break-words">
            <span className="font-medium">{item.code}</span>{" "}
            {item.title !== item.code ? (
              <span className="text-muted-foreground">{item.title} · </span>
            ) : null}
            {activityDescription(item)}
          </span>
        </Link>
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
  meaning,
  detail,
  href,
  alert,
  alertTone = "warning",
}: {
  label: string;
  value: string;
  meaning: string;
  detail: string;
  href: string;
  alert: boolean;
  alertTone?: "warning" | "danger";
}) {
  return (
    <div className="min-w-0 border-b px-3 py-4 last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-2">
        <Link
          href={href}
          className="group inline-flex items-baseline gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="text-2xl font-semibold tabular-nums tracking-tight group-hover:underline">
            {value}
          </span>
          <span className="text-xs text-muted-foreground">{meaning}</span>
        </Link>
      </dd>
      <dd
        className={`mt-1 text-xs ${alert ? (alertTone === "danger" ? "text-[var(--status-danger-fg)]" : "text-[var(--status-warning-fg)]") : "text-muted-foreground"}`}
      >
        {detail}
      </dd>
    </div>
  );
}

function ProjectInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}

function JoinedProjectDetailSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-label="プロジェクト概要を読み込み中"
    >
      <Skeleton className="h-8 w-60 max-w-full" />
      <Skeleton className="h-16 w-full max-w-2xl" />
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-44 w-full" />
    </div>
  );
}

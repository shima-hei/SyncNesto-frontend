"use client";

import { PageHeader } from "@/components/shared/layout/page-header";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectTaskSummarySection } from "@/features/tasks/components/sections/project-task-summary-section";
import { formatDate, formatDateTime } from "@/lib/format/date";

import { useProject } from "../../hooks/use-project";

type JoinedProjectDetailPageProps = {
  projectId: number;
};

export function JoinedProjectDetailPage({
  projectId,
}: JoinedProjectDetailPageProps) {
  const { project, isLoading, error } = useProject(projectId);

  if (isLoading) {
    return <JoinedProjectDetailSkeleton />;
  }

  if (error || !project) {
    return (
      <p role="alert" className="text-sm text-destructive">
        プロジェクト情報を取得できませんでした。画面を再読み込みしてください。
      </p>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader title={project.name} description={project.project_code} />

      <section
        aria-labelledby="project-overview-title"
        className="flex flex-col gap-3"
      >
        <h2 id="project-overview-title" className="text-base font-semibold">
          概要
        </h2>
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

      <ProjectTaskSummarySection projectId={project.id} />
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
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-60 max-w-full" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-16 w-full max-w-2xl" />
        <Skeleton className="h-10 w-full max-w-xl" />
      </div>
      <Skeleton className="h-px w-full" />
      <Skeleton className="h-44 w-full" />
    </div>
  );
}

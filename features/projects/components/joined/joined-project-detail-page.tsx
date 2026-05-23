"use client";

import Link from "next/link";
import {
  ClipboardListIcon,
  FileTextIcon,
  ListChecksIcon,
  UsersIcon,
  FolderOpenIcon,
  PlaySquareIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useProject } from "../../hooks/use-project";
import { formatDate, formatDateTime } from "../tables/projects-table";

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
      <div className="p-4 text-sm text-muted-foreground lg:p-6">
        プロジェクト情報を取得できませんでした。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{project.project_code}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>概要</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <ProjectInfo label="説明" value={project.description ?? "-"} />
          <ProjectInfo label="開始日" value={formatDate(project.start_date)} />
          <ProjectInfo label="終了日" value={formatDate(project.end_date)} />
          <ProjectInfo
            label="更新日時"
            value={formatDateTime(project.updated_at)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Button asChild variant="outline">
          <Link href={`/projects/joined/${project.id}/members`}>
            <UsersIcon data-icon="inline-start" />
            メンバー
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/projects/joined/${project.id}/requirements`}>
            <ListChecksIcon data-icon="inline-start" />
            要件定義
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/projects/joined/${project.id}/tasks`}>
            <ClipboardListIcon data-icon="inline-start" />
            タスク
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/projects/joined/${project.id}/test-designs`}>
            <FileTextIcon data-icon="inline-start" />
            テスト設計書
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/projects/joined/${project.id}/test-cases`}>
            <PlaySquareIcon data-icon="inline-start" />
            テストケース
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/projects/joined/${project.id}/documents`}>
            <FolderOpenIcon data-icon="inline-start" />
            ドキュメント
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ProjectInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function JoinedProjectDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

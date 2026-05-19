"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2Icon, UsersIcon } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { getProjectFormValues } from "../constants/project-form";
import { useDeleteProject } from "../hooks/use-delete-project";
import { useProject } from "../hooks/use-project";
import { useUpdateProject } from "../hooks/use-update-project";
import { ProjectForm } from "./project-form";
import { ProjectStatusBadge } from "./project-status-badge";

type ProjectDetailPageProps = {
  projectId: number;
};

export function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { project, isLoading, error } = useProject(projectId);
  const {
    updateProject,
    conflictCurrent,
    resetConflict,
    isPending,
    error: updateError,
  } = useUpdateProject(projectId);
  const { deleteProject, isPending: isDeletePending } =
    useDeleteProject(projectId);

  if (isLoading) {
    return <ProjectDetailSkeleton />;
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{project.name}</h2>
            <ProjectStatusBadge status={project.status} />
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {project.project_code}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/projects/management/${project.id}/members`}>
              <UsersIcon data-icon="inline-start" />
              メンバー管理
            </Link>
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2Icon data-icon="inline-start" />
            削除
          </Button>
        </div>
      </div>

      {conflictCurrent ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          他の更新と競合しました。最新の内容を確認してから再度更新してください。
          <button
            type="button"
            className="ml-2 underline underline-offset-4"
            onClick={resetConflict}
          >
            閉じる
          </button>
        </div>
      ) : null}

      <ProjectForm
        key={project.version}
        mode="update"
        initialValues={getProjectFormValues(project)}
        isPending={isPending}
        error={updateError}
        onSubmit={(values) => updateProject(values, project.version)}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="プロジェクトを削除しますか"
        description="削除すると元に戻せません。関連するメンバー情報も利用できなくなります。"
        confirmLabel="削除"
        destructive
        isPending={isDeletePending}
        onConfirm={deleteProject}
      />
    </div>
  );
}

function ProjectDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-96 w-full max-w-2xl" />
    </div>
  );
}

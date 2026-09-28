"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2Icon, UsersIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/layout/page-header";
import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { getProjectFormValues } from "../../constants/project-form";
import { useDeleteProject } from "../../hooks/use-delete-project";
import { useProject } from "../../hooks/use-project";
import { useUpdateProject } from "../../hooks/use-update-project";
import { ProjectForm } from "../forms/project-form";

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
      <div className="text-sm text-muted-foreground">
        プロジェクト情報を取得できませんでした。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={project.name}
        description={project.project_code}
        actions={
          <>
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
          </>
        }
      />

      <ProjectForm
        key={project.version}
        mode="update"
        initialValues={getProjectFormValues(project)}
        isPending={isPending}
        error={updateError}
        conflictValues={
          conflictCurrent ? getProjectFormValues(conflictCurrent) : null
        }
        onCloseConflict={resetConflict}
        onResolveConflict={(values) => {
          if (!conflictCurrent) {
            return Promise.resolve();
          }

          return updateProject(values, conflictCurrent.version);
        }}
        onSubmit={(values) => updateProject(values, project.version)}
      />

      <ResourceDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        resourceName="プロジェクト"
        description="削除すると元に戻せません。関連するメンバー情報も利用できなくなります。"
        isPending={isDeletePending}
        onConfirm={deleteProject}
      />
    </div>
  );
}

function ProjectDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-96 w-full max-w-2xl" />
    </div>
  );
}

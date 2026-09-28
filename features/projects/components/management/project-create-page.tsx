"use client";

import { PageHeader } from "@/components/shared/layout/page-header";

import { projectInitialValues } from "../../constants/project-form";
import { useCreateProject } from "../../hooks/use-create-project";
import { ProjectForm } from "../forms/project-form";

export function ProjectCreatePage() {
  const { createProject, isPending, error } = useCreateProject();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="プロジェクト登録"
        description="新しいプロジェクトを登録します。"
      />
      <ProjectForm
        mode="create"
        initialValues={projectInitialValues}
        isPending={isPending}
        error={error}
        onSubmit={createProject}
      />
    </div>
  );
}

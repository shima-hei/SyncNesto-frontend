"use client";

import { projectInitialValues } from "../constants/project-form";
import { useCreateProject } from "../hooks/use-create-project";
import { ProjectForm } from "./project-form";

export function ProjectCreatePage() {
  const { createProject, isPending, error } = useCreateProject();

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">プロジェクト登録</h2>
        <p className="text-sm text-muted-foreground">
          新しいプロジェクトを登録します。
        </p>
      </div>
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

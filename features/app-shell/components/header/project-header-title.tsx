"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ProjectStatusBadge } from "@/features/projects/components/shared/project-status-badge";
import { useProject } from "@/features/projects/hooks/use-project";

type ProjectHeaderTitleProps = {
  projectId: number;
  fallbackTitle: string;
};

export function ProjectHeaderTitle({
  projectId,
  fallbackTitle,
}: ProjectHeaderTitleProps) {
  const { project, isLoading, error } = useProject(projectId);

  if (isLoading) {
    return <Skeleton className="h-5 w-40" />;
  }

  if (error || !project) {
    return <h1 className="text-base font-medium">{fallbackTitle}</h1>;
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <h1 className="truncate text-base font-medium">{project.name}</h1>
      <ProjectStatusBadge status={project.status} />
    </div>
  );
}

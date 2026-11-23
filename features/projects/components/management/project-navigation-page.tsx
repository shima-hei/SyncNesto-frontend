"use client";

import { PageHeader } from "@/components/shared/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { canManageProjectMembers } from "@/features/auth/utils/authorization";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import { useCurrentProjectRole } from "../../hooks/use-current-project-role";
import { useProject } from "../../hooks/use-project";
import { ProjectNavigationSettings } from "./project-navigation-settings";

export function ProjectNavigationPage({ projectId }: { projectId: number }) {
  const { canManageTenant } = useTenant();
  const { currentProjectRole, isLoading: roleLoading } =
    useCurrentProjectRole(projectId);
  const { project, isLoading } = useProject(projectId);
  if (roleLoading || isLoading)
    return <Skeleton className="h-48 w-full max-w-2xl" />;
  if (
    !project ||
    (!canManageTenant && !canManageProjectMembers(currentProjectRole))
  ) {
    return (
      <p role="alert" className="text-sm text-muted-foreground">
        案件メニュー設定を変更する権限がありません。
      </p>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader
        title="案件メニュー設定"
        description="この案件で共通の表示順と表示位置を変更します。各画面のアクセス権限は従来どおり適用されます。"
      />
      <ProjectNavigationSettings project={project} />
    </div>
  );
}

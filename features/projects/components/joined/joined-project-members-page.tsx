"use client";

import { canManageProjectMembers } from "@/features/auth/utils/authorization";

import { useCurrentProjectRole } from "../../hooks/use-current-project-role";
import { ProjectMembersPage } from "../shared/project-members-page";

type JoinedProjectMembersPageProps = {
  projectId: number;
};

export function JoinedProjectMembersPage({
  projectId,
}: JoinedProjectMembersPageProps) {
  const { currentProjectRole, isLoading } = useCurrentProjectRole(projectId);
  const canManageMembers = canManageProjectMembers(currentProjectRole);

  return (
    <ProjectMembersPage
      projectId={projectId}
      canManageMembers={canManageMembers}
      isPermissionLoading={isLoading}
      userSelectMode="candidates"
    />
  );
}

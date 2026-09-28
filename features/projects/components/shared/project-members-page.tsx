"use client";

import { useState } from "react";

import { PageHeader } from "@/components/shared/layout/page-header";
import { ConflictResolutionDialog } from "@/components/shared/dialogs/conflict-resolution-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { getConflictFields } from "@/lib/api/conflict";
import type { ProjectMemberRead } from "@/lib/api/generated/model";

import { PROJECT_ROLE_KEYS } from "@/features/auth/constants/roles";
import { getProjectRoleLabel } from "../../constants/project-roles";
import { useAddProjectMember } from "../../hooks/use-add-project-member";
import { useProject } from "../../hooks/use-project";
import { useProjectMembers } from "../../hooks/use-project-members";
import { useProjectMemberUsers } from "../../hooks/use-project-member-users";
import { useRemoveProjectMember } from "../../hooks/use-remove-project-member";
import { useUpdateProjectMember } from "../../hooks/use-update-project-member";
import { ProjectMemberForm } from "../forms/project-member-form";
import { ProjectMembersTable } from "../tables/project-members-table";

type ProjectMembersPageProps = {
  projectId: number;
  canManageMembers?: boolean;
  isPermissionLoading?: boolean;
  userSelectMode?: "directory" | "candidates";
};

type ProjectMemberRoleValues = {
  roleKey: string;
};

type ProjectMemberUpdateAttempt = {
  member: ProjectMemberRead;
  values: ProjectMemberRoleValues;
};

export function ProjectMembersPage({
  projectId,
  canManageMembers = true,
  isPermissionLoading = false,
  userSelectMode = "directory",
}: ProjectMembersPageProps) {
  const { user: currentUser } = useAuth();
  const [updateAttempt, setUpdateAttempt] =
    useState<ProjectMemberUpdateAttempt | null>(null);
  const { project, isLoading: isProjectLoading } = useProject(projectId);
  const { members, isLoading: isMembersLoading } = useProjectMembers(projectId);
  const { users: memberUsers } = useProjectMemberUsers(projectId, {
    limit: 100,
  });
  const memberUserIds = members.map((member) => member.user_id);
  const {
    addProjectMember,
    isPending: isAddPending,
    error: addError,
  } = useAddProjectMember(projectId);
  const {
    updateProjectMember,
    conflictCurrent,
    resetConflict,
    isPending: isUpdatePending,
  } = useUpdateProjectMember(projectId);
  const { removeProjectMember, isPending: isRemovePending } =
    useRemoveProjectMember(projectId);
  const projectAdminCount = members.filter(
    (member) => member.role.key === PROJECT_ROLE_KEYS.projectAdmin,
  ).length;
  const conflictValues = conflictCurrent
    ? toProjectMemberRoleValues(conflictCurrent)
    : null;
  const conflictFields =
    updateAttempt && conflictValues
      ? getConflictFields({
          original: toProjectMemberRoleValues(updateAttempt.member) as Record<
            string,
            unknown
          >,
          local: updateAttempt.values as Record<string, unknown>,
          current: conflictValues as Record<string, unknown>,
        })
      : [];

  const handleResetConflict = () => {
    setUpdateAttempt(null);
    resetConflict();
  };

  if (isProjectLoading || isPermissionLoading) {
    return <ProjectMembersSkeleton />;
  }

  if (!project) {
    return (
      <div className="text-sm text-muted-foreground">
        プロジェクト情報を取得できませんでした。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="メンバー管理"
        description={
          canManageMembers
            ? `${project.name} のメンバーと権限を管理します。`
            : `${project.name} のメンバーと権限を確認します。`
        }
      />

      {canManageMembers ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">メンバー追加</h2>
          <ProjectMemberForm
            projectId={projectId}
            excludedUserIds={memberUserIds}
            isPending={isAddPending}
            error={addError}
            userSelectMode={userSelectMode}
            onSubmit={addProjectMember}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">メンバー一覧</h2>
        <ProjectMembersTable
          members={members}
          users={memberUsers}
          isLoading={isMembersLoading}
          canManageMembers={canManageMembers}
          currentUserId={currentUser?.id ?? null}
          projectAdminCount={projectAdminCount}
          isUpdatePending={isUpdatePending}
          isRemovePending={isRemovePending}
          onUpdateRole={(member, roleKey) => {
            setUpdateAttempt({
              member,
              values: {
                roleKey,
              },
            });

            return updateProjectMember({
              userId: member.user_id,
              version: member.version,
              roleKey,
            });
          }}
          onRemove={removeProjectMember}
        />
      </div>

      {updateAttempt && conflictCurrent && conflictValues ? (
        <ConflictResolutionDialog
          open
          fields={conflictFields}
          localValues={updateAttempt.values}
          currentValues={conflictValues}
          fieldLabels={PROJECT_MEMBER_CONFLICT_FIELD_LABELS}
          valueFormatters={PROJECT_MEMBER_CONFLICT_VALUE_FORMATTERS}
          isPending={isUpdatePending}
          onOpenChange={(open) => !open && handleResetConflict()}
          onResolve={async (resolvedValues) => {
            await updateProjectMember({
              userId: conflictCurrent.user_id,
              version: conflictCurrent.version,
              roleKey: resolvedValues.roleKey,
            });
          }}
        />
      ) : null}
    </div>
  );
}

function ProjectMembersSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-32 w-full max-w-2xl" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

const toProjectMemberRoleValues = (
  member: ProjectMemberRead,
): ProjectMemberRoleValues => {
  return {
    roleKey: member.role.key,
  };
};

const PROJECT_MEMBER_CONFLICT_FIELD_LABELS = {
  roleKey: "権限",
} satisfies Partial<Record<keyof ProjectMemberRoleValues, string>>;

const PROJECT_MEMBER_CONFLICT_VALUE_FORMATTERS = {
  roleKey: (value: unknown) =>
    typeof value === "string" ? getProjectRoleLabel(value) : "-",
} satisfies Partial<
  Record<keyof ProjectMemberRoleValues, (value: unknown) => string>
>;

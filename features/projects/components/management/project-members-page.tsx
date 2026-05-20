"use client";

import { useState } from "react";

import { ConflictResolutionDialog } from "@/components/shared/conflict-resolution-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsers } from "@/features/users/hooks/use-users";
import { getConflictFields } from "@/lib/api/conflict";
import type { ProjectMemberRead } from "@/lib/api/generated/model";

import { getProjectRoleLabel } from "../../constants/project-roles";
import { useAddProjectMember } from "../../hooks/use-add-project-member";
import { useProject } from "../../hooks/use-project";
import { useProjectMembers } from "../../hooks/use-project-members";
import { useRemoveProjectMember } from "../../hooks/use-remove-project-member";
import { useUpdateProjectMember } from "../../hooks/use-update-project-member";
import { ProjectMemberForm } from "../forms/project-member-form";
import { ProjectMembersTable } from "../tables/project-members-table";

type ProjectMembersPageProps = {
  projectId: number;
};

type ProjectMemberRoleValues = {
  roleKey: string;
};

type ProjectMemberUpdateAttempt = {
  member: ProjectMemberRead;
  values: ProjectMemberRoleValues;
};

export function ProjectMembersPage({ projectId }: ProjectMembersPageProps) {
  const [updateAttempt, setUpdateAttempt] =
    useState<ProjectMemberUpdateAttempt | null>(null);
  const { project, isLoading: isProjectLoading } = useProject(projectId);
  const { members, isLoading: isMembersLoading } = useProjectMembers(projectId);
  const memberUserIds = members.map((member) => member.user_id);
  const { users } = useUsers({
    page: 1,
    page_size: 100,
    is_active: true,
  });
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
  const conflictValues = conflictCurrent
    ? toProjectMemberRoleValues(conflictCurrent)
    : null;
  const conflictFields =
    updateAttempt && conflictValues
      ? getConflictFields({
          original: toProjectMemberRoleValues(
            updateAttempt.member
          ) as Record<string, unknown>,
          local: updateAttempt.values as Record<string, unknown>,
          current: conflictValues as Record<string, unknown>,
        })
      : [];

  const handleResetConflict = () => {
    setUpdateAttempt(null);
    resetConflict();
  };

  if (isProjectLoading) {
    return <ProjectMembersSkeleton />;
  }

  if (!project) {
    return (
      <div className="p-4 text-sm text-muted-foreground lg:p-6">
        プロジェクト情報を取得できませんでした。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">メンバー管理</h2>
        <p className="text-sm text-muted-foreground">
          {project.name} のメンバーと権限を管理します。
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">メンバー追加</h3>
        <ProjectMemberForm
          excludedUserIds={memberUserIds}
          isPending={isAddPending}
          error={addError}
          onSubmit={addProjectMember}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">メンバー一覧</h3>
        <ProjectMembersTable
          members={members}
          users={users}
          isLoading={isMembersLoading}
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
    <div className="flex flex-col gap-6 p-4 lg:p-6">
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
  member: ProjectMemberRead
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

"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useUsers } from "@/features/users/hooks/use-users";

import { useAddProjectMember } from "../hooks/use-add-project-member";
import { useProject } from "../hooks/use-project";
import { useProjectMembers } from "../hooks/use-project-members";
import { useRemoveProjectMember } from "../hooks/use-remove-project-member";
import { useUpdateProjectMember } from "../hooks/use-update-project-member";
import { ProjectMemberForm } from "./project-member-form";
import { ProjectMembersTable } from "./project-members-table";

type ProjectMembersPageProps = {
  projectId: number;
};

export function ProjectMembersPage({ projectId }: ProjectMembersPageProps) {
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
          onUpdateRole={(member, roleKey) =>
            updateProjectMember({
              userId: member.user_id,
              version: member.version,
              roleKey,
            })
          }
          onRemove={removeProjectMember}
        />
      </div>
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

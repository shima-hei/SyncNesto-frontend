"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { TableEmptyRow } from "@/components/shared/tables/table-empty-row";
import { TableListSkeleton } from "@/components/shared/tables/table-list-skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProjectMemberRead, UserSummary } from "@/lib/api/generated/model";

import { PROJECT_ROLE_KEYS } from "@/features/auth/constants/roles";
import {
  PROJECT_ROLE_OPTIONS,
  getProjectRoleLabel,
} from "../../constants/project-roles";

type ProjectMembersTableProps = {
  members: ProjectMemberRead[];
  users: UserSummary[];
  isLoading: boolean;
  isUpdatePending: boolean;
  isRemovePending: boolean;
  canManageMembers?: boolean;
  currentUserId?: number | null;
  projectAdminCount?: number;
  onUpdateRole?: (
    member: ProjectMemberRead,
    roleKey: string,
  ) => Promise<unknown>;
  onRemove?: (userId: number) => Promise<void>;
};

export function ProjectMembersTable({
  members,
  users,
  isLoading,
  isUpdatePending,
  isRemovePending,
  canManageMembers = true,
  currentUserId = null,
  projectAdminCount = 0,
  onUpdateRole,
  onRemove,
}: ProjectMembersTableProps) {
  const [removeTarget, setRemoveTarget] = useState<ProjectMemberRead | null>(
    null,
  );

  if (isLoading) {
    return (
      <TableListSkeleton
        rows={4}
        widths={
          canManageMembers ? ["w-40", "w-56", "w-52", "w-20"] : ["w-40", "w-40"]
        }
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ユーザー</TableHead>
            <TableHead>権限</TableHead>
            {canManageMembers ? (
              <TableHead className="w-32">操作</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length ? (
            members.map((member) => (
              <ProjectMemberRow
                key={`${member.id}-${member.role.key}-${member.version}`}
                member={member}
                user={users.find((item) => item.id === member.user_id)}
                canManageMembers={canManageMembers}
                currentUserId={currentUserId}
                projectAdminCount={projectAdminCount}
                isUpdatePending={isUpdatePending}
                onUpdateRole={onUpdateRole}
                onRemove={() => setRemoveTarget(member)}
              />
            ))
          ) : (
            <TableEmptyRow
              colSpan={canManageMembers ? 3 : 2}
              message="プロジェクトメンバーが登録されていません。"
            />
          )}
        </TableBody>
      </Table>

      {canManageMembers ? (
        <ResourceDeleteDialog
          open={Boolean(removeTarget)}
          onOpenChange={(open) => !open && setRemoveTarget(null)}
          resourceName="メンバー"
          description="削除したメンバーは再度追加できます。"
          isPending={isRemovePending}
          onConfirm={async () => {
            if (!removeTarget || !onRemove) {
              return;
            }

            await onRemove(removeTarget.user_id);
            setRemoveTarget(null);
          }}
        />
      ) : null}
    </>
  );
}

function ProjectMemberRow({
  member,
  user,
  canManageMembers,
  currentUserId,
  projectAdminCount,
  isUpdatePending,
  onUpdateRole,
  onRemove,
}: {
  member: ProjectMemberRead;
  user?: UserSummary;
  canManageMembers: boolean;
  currentUserId: number | null;
  projectAdminCount: number;
  isUpdatePending: boolean;
  onUpdateRole?: (
    member: ProjectMemberRead,
    roleKey: string,
  ) => Promise<unknown>;
  onRemove: () => void;
}) {
  const [roleKey, setRoleKey] = useState(member.role.key);
  const isChanged = roleKey !== member.role.key;
  const isCurrentUser = member.user_id === currentUserId;
  const isLastProjectAdmin =
    member.role.key === PROJECT_ROLE_KEYS.projectAdmin &&
    projectAdminCount <= 1;
  const isDemotingLastProjectAdmin =
    isLastProjectAdmin && roleKey !== PROJECT_ROLE_KEYS.projectAdmin;
  const isRoleSelectDisabled = isLastProjectAdmin;
  const isUpdateDisabled =
    !isChanged || isUpdatePending || isDemotingLastProjectAdmin;
  const isRemoveDisabled = isCurrentUser || isLastProjectAdmin;

  return (
    <TableRow>
      <TableCell>
        <div className="flex min-w-56 flex-col">
          <span className="truncate font-medium">
            {user?.name ?? `ユーザーID: ${member.user_id}`}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {user?.email ?? `ID ${member.user_id}`}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {canManageMembers ? (
          <>
            <div className="flex items-center gap-2">
              <Select
                value={roleKey}
                disabled={isRoleSelectDisabled}
                onValueChange={setRoleKey}
              >
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="権限を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {PROJECT_ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isUpdateDisabled}
                onClick={() => {
                  onUpdateRole?.(member, roleKey).catch(() => undefined);
                }}
              >
                {isUpdatePending ? <Spinner data-icon="inline-start" /> : null}
                更新
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              現在: {getProjectRoleLabel(member.role.key)}
            </p>
          </>
        ) : (
          <span className="text-sm">
            {getProjectRoleLabel(member.role.key)}
          </span>
        )}
      </TableCell>
      {canManageMembers ? (
        <TableCell>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isRemoveDisabled}
            onClick={onRemove}
          >
            <Trash2Icon data-icon="inline-start" />
            削除
          </Button>
        </TableCell>
      ) : null}
    </TableRow>
  );
}

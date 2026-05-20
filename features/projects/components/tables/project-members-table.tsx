"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ProjectMemberRead,
  UserListItem,
} from "@/lib/api/generated/model";

import {
  PROJECT_ROLE_OPTIONS,
  getProjectRoleLabel,
} from "../../constants/project-roles";

type ProjectMembersTableProps = {
  members: ProjectMemberRead[];
  users: UserListItem[];
  isLoading: boolean;
  isUpdatePending: boolean;
  isRemovePending: boolean;
  onUpdateRole: (member: ProjectMemberRead, roleKey: string) => Promise<unknown>;
  onRemove: (userId: number) => Promise<void>;
};

export function ProjectMembersTable({
  members,
  users,
  isLoading,
  isUpdatePending,
  isRemovePending,
  onUpdateRole,
  onRemove,
}: ProjectMembersTableProps) {
  const [removeTarget, setRemoveTarget] = useState<ProjectMemberRead | null>(
    null
  );

  if (isLoading) {
    return <ProjectMembersTableSkeleton />;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ユーザー</TableHead>
            <TableHead>権限</TableHead>
            <TableHead className="w-32">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length ? (
            members.map((member) => (
              <ProjectMemberRow
                key={`${member.id}-${member.role.key}-${member.version}`}
                member={member}
                user={users.find((item) => item.id === member.user_id)}
                isUpdatePending={isUpdatePending}
                onUpdateRole={onUpdateRole}
                onRemove={() => setRemoveTarget(member)}
              />
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={3}
                className="h-24 text-center text-muted-foreground"
              >
                プロジェクトメンバーが登録されていません。
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="メンバーを削除しますか"
        description="削除したメンバーは再度追加できます。"
        confirmLabel="削除"
        destructive
        isPending={isRemovePending}
        onConfirm={async () => {
          if (!removeTarget) {
            return;
          }

          await onRemove(removeTarget.user_id);
          setRemoveTarget(null);
        }}
      />
    </>
  );
}

function ProjectMemberRow({
  member,
  user,
  isUpdatePending,
  onUpdateRole,
  onRemove,
}: {
  member: ProjectMemberRead;
  user?: UserListItem;
  isUpdatePending: boolean;
  onUpdateRole: (member: ProjectMemberRead, roleKey: string) => Promise<unknown>;
  onRemove: () => void;
}) {
  const [roleKey, setRoleKey] = useState(member.role.key);
  const isChanged = roleKey !== member.role.key;

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
        <div className="flex items-center gap-2">
          <Select value={roleKey} onValueChange={setRoleKey}>
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
            disabled={!isChanged || isUpdatePending}
            onClick={() => {
              onUpdateRole(member, roleKey).catch(() => undefined);
            }}
          >
            {isUpdatePending ? <Spinner data-icon="inline-start" /> : null}
            更新
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          現在: {getProjectRoleLabel(member.role.key)}
        </p>
      </TableCell>
      <TableCell>
        <Button type="button" variant="outline" size="sm" onClick={onRemove}>
          <Trash2Icon data-icon="inline-start" />
          削除
        </Button>
      </TableCell>
    </TableRow>
  );
}

function ProjectMembersTableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-2 py-2">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

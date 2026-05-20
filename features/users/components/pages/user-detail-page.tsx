"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/shared/user-avatar";

import { getUserFormValues } from "../../constants/user-form";
import { useUpdateUser } from "../../hooks/use-update-user";
import { useUser } from "../../hooks/use-user";
import { UserForm } from "../forms/user-form";
import { UserSystemRoles } from "../shared/user-system-roles";

type UserDetailPageProps = {
  userId: number;
};

export function UserDetailPage({ userId }: UserDetailPageProps) {
  const { user, isLoading, error } = useUser(userId);
  const {
    updateUser,
    conflictCurrent,
    resetConflict,
    isPending,
    error: updateError,
  } = useUpdateUser(userId);

  if (isLoading) {
    return <UserDetailSkeleton />;
  }

  if (error || !user) {
    return (
      <div className="p-4 text-sm text-muted-foreground lg:p-6">
        ユーザー情報を取得できませんでした。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <UserAvatar name={user.name} src={user.avatar_url} size="lg" />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="truncate text-lg font-semibold">{user.name}</h2>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={user.is_active ? "secondary" : "outline"}>
            {user.is_active ? "有効" : "無効"}
          </Badge>
          <UserSystemRoles roles={user.system_roles} />
        </div>
      </div>

      <UserForm
        key={user.version}
        mode="update"
        initialValues={getUserFormValues(user)}
        isPending={isPending}
        error={updateError}
        conflictValues={
          conflictCurrent ? getUserFormValues(conflictCurrent) : null
        }
        onCloseConflict={resetConflict}
        onResolveConflict={(values) => {
          if (!conflictCurrent) {
            return Promise.resolve();
          }

          return updateUser(values, conflictCurrent.version);
        }}
        onSubmit={(values) => updateUser(values, user.version)}
      />
    </div>
  );
}

function UserDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-96 w-full max-w-2xl" />
    </div>
  );
}

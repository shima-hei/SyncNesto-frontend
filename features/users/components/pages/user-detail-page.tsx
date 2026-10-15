"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/shared/display/user-avatar";

import { getUserFormValues } from "../../constants/user-form";
import { getUserTypeLabel } from "../../constants/user-types";
import { useUpdateUser } from "../../hooks/use-update-user";
import { useUser } from "../../hooks/use-user";
import { UserForm } from "../forms/user-form";
import { UserSystemRoles } from "../shared/user-system-roles";
import { UserMfaRecovery } from "../shared/user-mfa-recovery";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SystemUserMemberships } from "@/features/system-management/components/system-user-memberships";

type UserDetailPageProps = {
  userId: number;
  fromTenant?: number;
};

export function UserDetailPage({ userId, fromTenant }: UserDetailPageProps) {
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
      <div className="text-sm text-muted-foreground">
        ユーザー情報を取得できませんでした。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="outline" className="self-start">
        <Link
          href={fromTenant ? `/system/tenants/${fromTenant}` : "/system/users"}
        >
          {fromTenant ? "組織詳細へ戻る" : "ユーザー一覧へ戻る"}
        </Link>
      </Button>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar name={user.name} src={user.avatar_url} size="lg" />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight break-words">
              {user.name}
            </h1>
            <p className="text-sm text-muted-foreground break-all">
              {user.email}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{getUserTypeLabel(user.user_type)}</Badge>
          <Badge variant={user.is_active ? "secondary" : "outline"}>
            {user.is_active ? "有効" : "全体停止"}
          </Badge>
          <UserSystemRoles roles={user.system_roles} />
        </div>
      </div>

      <SystemUserMemberships userId={userId} />
      <section className="flex flex-col gap-3" aria-label="共通アカウント設定">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">共通アカウント設定</h2>
          <p className="text-sm text-muted-foreground">
            以下の変更は所属するすべての組織に適用されます。組織内の氏名・部署・役割は、組織ごとの設定で管理します。
          </p>
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
      </section>
      <UserMfaRecovery userId={userId} email={user.email} />
    </div>
  );
}

function UserDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex min-w-0 items-center gap-3">
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

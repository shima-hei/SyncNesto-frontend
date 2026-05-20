"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/providers/auth-provider";

import { AccountAvatarSection } from "../avatar/account-avatar-section";
import { AccountProfileForm } from "../forms/account-profile-form";
import { AccountReadonlyInfo } from "../shared/account-readonly-info";

export function AccountPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <AccountPageSkeleton />;
  }

  if (!user) {
    return (
      <div className="p-4 text-sm text-muted-foreground lg:p-6">
        アカウント情報を取得できませんでした。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">アカウント</h2>
        <p className="text-sm text-muted-foreground">
          自分のプロフィール情報を確認・更新します。
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <AccountAvatarSection user={user} />
        <AccountReadonlyInfo user={user} />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-medium">プロフィール編集</h3>
          <p className="text-sm text-muted-foreground">
            メールアドレス、状態、権限、部署、役職は管理者のみ変更できます。
          </p>
        </div>
        <AccountProfileForm key={user.version} user={user} />
      </section>
    </div>
  );
}

function AccountPageSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-4 lg:p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <Skeleton className="h-72 w-full max-w-2xl" />
    </div>
  );
}

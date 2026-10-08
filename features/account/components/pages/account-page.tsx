"use client";

import { PageHeader } from "@/components/shared/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/providers/auth-provider";

import { AccountAvatarSection } from "../avatar/account-avatar-section";
import { AccountProfileForm } from "../forms/account-profile-form";
import { AccountReadonlyInfo } from "../shared/account-readonly-info";
import { AccountCredentialsSection } from "../sections/account-credentials-section";
import { McpConnections } from "@/features/mcp/components/mcp-connections";

export function AccountPage({ mcpEnabled = false }: { mcpEnabled?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <AccountPageSkeleton />;
  }

  if (!user) {
    return (
      <div className="text-sm text-muted-foreground">
        アカウント情報を取得できませんでした。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="アカウント"
        description="自分のプロフィール情報を確認・更新します。"
      />

      <section className="flex flex-col gap-4">
        <AccountAvatarSection user={user} />
        <AccountReadonlyInfo user={user} />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">プロフィール編集</h2>
          <p className="text-sm text-muted-foreground">
            共通の名前を変更します。組織内の表示名・部署・役職は組織管理者が管理します。
          </p>
        </div>
        <AccountProfileForm key={user.version} user={user} />
      </section>
      <AccountCredentialsSection
        key={`credentials:${user.email}`}
        user={user}
      />
      {mcpEnabled && !user.demo ? <McpConnections /> : null}
    </div>
  );
}

function AccountPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
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

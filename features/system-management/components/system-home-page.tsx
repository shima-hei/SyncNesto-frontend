"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/layout/page-header";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getSystemSummarySystemSummaryGet } from "@/lib/api/generated/system-management/system-management";
import { useSystemQuery } from "../hooks/use-system-query";

export function SystemHomePage() {
  const query = useSystemQuery(["summary"], ({ signal }) =>
    getSystemSummarySystemSummaryGet({ signal }),
  );
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="システム管理ホーム"
        description="全組織とユーザーの利用状況を確認し、運営に必要な管理を行います。"
      />
      {query.isPending ? (
        <Skeleton className="h-32" />
      ) : query.isError ? (
        <DataLoadError
          resourceName="システムの利用状況"
          onRetry={() => void query.refetch()}
        />
      ) : (
        <dl className="grid gap-6 border-y py-5 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryValue
            label="組織"
            value={query.data.total_tenants}
            detail={`有効 ${query.data.active_tenants}・停止中 ${query.data.suspended_tenants}`}
          />
          <SummaryValue
            label="ユーザー"
            unit="人"
            value={query.data.total_users}
            detail={`有効 ${query.data.active_users}・全体停止 ${query.data.inactive_users}`}
          />
          <SummaryValue
            label="有効な組織所属のないユーザー"
            unit="人"
            href="/system/users?membership=unassigned"
            value={query.data.users_without_active_membership}
            detail="未所属・所属停止・組織停止を含みます"
          />
        </dl>
      )}
      <section className="flex flex-col gap-4" aria-label="管理メニュー">
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">組織から管理する</h2>
            <p className="text-sm text-muted-foreground">
              組織の状態とOwnerを確認し、所属ユーザーへ進みます。
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/system/tenants">組織一覧を開く</Link>
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">
              ユーザーを横断して管理する
            </h2>
            <p className="text-sm text-muted-foreground">
              アカウント情報、複数組織への所属、復旧対応を確認します。
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/system/users">全ユーザー一覧を開く</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function SummaryValue({
  label,
  value,
  detail,
  unit = "件",
  href,
}: {
  label: string;
  value: number;
  detail: string;
  unit?: string;
  href?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">
        {href ? (
          <Link
            href={href}
            className="text-primary underline underline-offset-4"
          >
            {value}
          </Link>
        ) : (
          value
        )}
        <span className="ml-1 text-sm font-normal">{unit}</span>
      </dd>
      <dd className="text-xs text-muted-foreground">{detail}</dd>
    </div>
  );
}

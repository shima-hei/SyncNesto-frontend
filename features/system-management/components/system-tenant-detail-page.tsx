"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/layout/page-header";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { SearchFilterBar } from "@/components/shared/filters/search-filter-bar";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { TableEmptyRow } from "@/components/shared/tables/table-empty-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getSystemTenantSystemTenantsTenantIdGet,
  listSystemTenantMembersSystemTenantsTenantIdMembersGet,
} from "@/lib/api/generated/system-management/system-management";
import type { ListSystemTenantMembersSystemTenantsTenantIdMembersGetParams } from "@/lib/api/generated/model";
import { TENANT_ROLE_LABELS } from "@/features/tenants/constants/roles";
import { formatDateTime } from "@/lib/format/date";
import { useSystemQuery } from "../hooks/use-system-query";
import { SystemStatusFilter } from "./system-status-filter";

const PAGE_SIZE = 20;

export function SystemTenantDetailPage({ tenantId }: { tenantId: number }) {
  const query = useSystemQuery(["tenant", tenantId], ({ signal }) =>
    getSystemTenantSystemTenantsTenantIdGet(tenantId, { signal }),
  );
  const [page, setPage] = useState(1);
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const params: ListSystemTenantMembersSystemTenantsTenantIdMembersGetParams = {
    page,
    page_size: PAGE_SIZE,
    q: q || undefined,
    status: status === "active" || status === "suspended" ? status : undefined,
  };
  const members = useSystemQuery(
    ["tenant", tenantId, "members", params],
    ({ signal }) =>
      listSystemTenantMembersSystemTenantsTenantIdMembersGet(tenantId, params, {
        signal,
      }),
  );
  if (query.isPending) return <Skeleton className="h-40" />;
  if (query.isError)
    return (
      <DataLoadError
        resourceName="組織情報"
        onRetry={() => void query.refetch()}
      />
    );
  const tenant = query.data;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tenant.name}
        description="組織の管理情報と所属ユーザーを確認します。"
        actions={
          <Button asChild variant="outline">
            <Link href="/system/tenants">組織一覧へ戻る</Link>
          </Button>
        }
      />
      <dl className="grid gap-4 border-y py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground">識別子</dt>
          <dd className="break-all">{tenant.slug}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground">組織の状態</dt>
          <dd>
            <Badge
              variant={tenant.status === "active" ? "secondary" : "outline"}
            >
              {tenant.status === "active" ? "有効" : "停止中"}
            </Badge>
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground">所属ユーザー</dt>
          <dd>
            {tenant.member_count}人（有効 {tenant.active_member_count}人）
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground">Owner</dt>
          <dd>
            {tenant.owners.length
              ? tenant.owners.map((owner) => (
                  <div key={owner.user_id}>
                    <Link
                      className="text-primary underline underline-offset-4"
                      href={`/system/users/${owner.user_id}?fromTenant=${tenantId}`}
                    >
                      {owner.display_name}
                    </Link>
                  </div>
                ))
              : "有効なOwnerなし"}
          </dd>
        </div>
      </dl>
      <section
        className="flex flex-col gap-4"
        aria-labelledby="tenant-members-title"
      >
        <div className="flex flex-col gap-1">
          <h2 id="tenant-members-title" className="text-base font-semibold">
            所属ユーザー
          </h2>
          <p className="text-sm text-muted-foreground">
            組織での所属状態と、全組織に影響するアカウントの状態を分けて表示します。
          </p>
        </div>
        <SearchFilterBar
          searchLabel="所属ユーザーを検索"
          searchValue={input}
          searchPlaceholder="氏名・メール・部署・役職で検索"
          onSearchValueChange={setInput}
          onSearch={() => {
            setQ(input.trim());
            setPage(1);
          }}
        >
          <SystemStatusFilter
            value={status}
            label="組織への所属状態"
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
        </SearchFilterBar>
        {members.isPending ? (
          <Skeleton className="h-40" />
        ) : members.isError ? (
          <DataLoadError
            resourceName="所属ユーザー"
            onRetry={() => void members.refetch()}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ユーザー</TableHead>
                  <TableHead>組織内の役割</TableHead>
                  <TableHead>部署・役職</TableHead>
                  <TableHead>所属状態</TableHead>
                  <TableHead>アカウント全体</TableHead>
                  <TableHead>最終ログイン</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.data.items.length ? (
                  members.data.items.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Link
                          href={`/system/users/${member.user_id}?fromTenant=${tenantId}`}
                          className="font-medium text-primary underline underline-offset-4"
                        >
                          {member.display_name}
                        </Link>
                        <p className="text-xs text-muted-foreground break-all">
                          {member.email}
                        </p>
                      </TableCell>
                      <TableCell>
                        {TENANT_ROLE_LABELS[member.role_key]}
                      </TableCell>
                      <TableCell>
                        {member.department ?? "-"}
                        <p className="text-xs text-muted-foreground">
                          {member.position ?? "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.status === "active" ? "secondary" : "outline"
                          }
                        >
                          {member.status === "active" ? "有効" : "停止中"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.account_is_active ? "secondary" : "outline"
                          }
                        >
                          {member.account_is_active ? "有効" : "全体停止"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDateTime(member.last_login_at)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableEmptyRow
                    colSpan={6}
                    message="条件に一致する所属ユーザーがいません。"
                  />
                )}
              </TableBody>
            </Table>
            <DataPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={members.data.total}
              currentCount={members.data.items.length}
              isFetching={members.isFetching}
              onPageChange={setPage}
            />
          </>
        )}
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { SearchFilterBar } from "@/components/shared/filters/search-filter-bar";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { TableEmptyRow } from "@/components/shared/tables/table-empty-row";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listSystemTenantsSystemTenantsGet } from "@/lib/api/generated/system-management/system-management";
import type {
  SystemTenantRead,
  ListSystemTenantsSystemTenantsGetParams,
} from "@/lib/api/generated/model";
import { useSystemQuery } from "../hooks/use-system-query";
import { SystemStatusFilter } from "./system-status-filter";

const PAGE_SIZE = 20;

export function SystemTenantsList({
  onWelcome,
  disabled,
}: {
  onWelcome: (tenant: SystemTenantRead) => void;
  disabled: boolean;
}) {
  const [page, setPage] = useState(1);
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const params: ListSystemTenantsSystemTenantsGetParams = {
    page,
    page_size: PAGE_SIZE,
    q: q || undefined,
    status: status === "active" || status === "suspended" ? status : undefined,
  };
  const query = useSystemQuery(["tenants", params], ({ signal }) =>
    listSystemTenantsSystemTenantsGet(params, { signal }),
  );
  return (
    <section className="flex flex-col gap-4" aria-label="組織一覧">
      <SearchFilterBar
        searchLabel="組織を検索"
        searchValue={input}
        searchPlaceholder="組織名・識別子で検索"
        onSearchValueChange={setInput}
        onSearch={() => {
          setQ(input.trim());
          setPage(1);
        }}
      >
        <SystemStatusFilter
          value={status}
          label="組織の状態"
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
      </SearchFilterBar>
      {query.isPending ? (
        <Skeleton className="h-40" />
      ) : query.isError ? (
        <DataLoadError
          resourceName="組織"
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>組織</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>所属ユーザー</TableHead>
                <TableHead>発行案内</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.length ? (
                query.data.items.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <Link
                        href={`/system/tenants/${tenant.id}`}
                        className="font-medium text-primary underline underline-offset-4"
                      >
                        {tenant.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {tenant.slug}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tenant.status === "active" ? "secondary" : "outline"
                        }
                      >
                        {tenant.status === "active" ? "有効" : "停止中"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tenant.owners.length ? (
                        tenant.owners.map((owner) => (
                          <div key={owner.user_id}>
                            <Link
                              href={`/system/users/${owner.user_id}?fromTenant=${tenant.id}`}
                              className="underline underline-offset-4"
                            >
                              {owner.display_name}
                            </Link>
                          </div>
                        ))
                      ) : (
                        <span className="text-muted-foreground">
                          有効なOwnerなし
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="tabular-nums">
                        {tenant.member_count}人
                      </span>
                      <p className="text-xs text-muted-foreground">
                        有効 {tenant.active_member_count}人
                      </p>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={disabled || tenant.status !== "active"}
                        onClick={() => onWelcome(tenant)}
                      >
                        案内メール
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmptyRow
                  colSpan={5}
                  message="条件に一致する組織がありません。"
                />
              )}
            </TableBody>
          </Table>
          <DataPagination
            page={page}
            pageSize={PAGE_SIZE}
            total={query.data.total}
            currentCount={query.data.items.length}
            isFetching={query.isFetching}
            onPageChange={setPage}
          />
        </>
      )}
    </section>
  );
}

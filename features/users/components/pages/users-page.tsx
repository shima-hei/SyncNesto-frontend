"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { PageHeader } from "@/components/shared/layout/page-header";
import { SearchFilterBar } from "@/components/shared/filters/search-filter-bar";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useUsers } from "../../hooks/use-users";
import { UsersTable } from "../tables/users-table";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";

const PAGE_SIZE = 20;

export function UsersPage({
  withoutActiveMembership = false,
}: {
  withoutActiveMembership?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [membershipFilter, setMembershipFilter] = useState(
    withoutActiveMembership ? "unassigned" : "all",
  );
  const isActive = getIsActiveParam(activeFilter);
  const userListParams = useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      q: q || undefined,
      is_active: isActive,
      without_active_membership: membershipFilter === "unassigned" || undefined,
    }),
    [isActive, membershipFilter, page, q],
  );
  const { users, total, isLoading, isFetching, error, refetch } =
    useUsers(userListParams);

  const handleSearch = () => {
    setPage(1);
    setQ(searchInput.trim());
  };

  const handleActiveFilterChange = (value: string) => {
    setPage(1);
    setActiveFilter(value);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="全体のユーザー管理"
        description="システムに登録されているユーザーを管理します。"
        actions={
          <Button asChild>
            <Link href="/system/users/new">ユーザー登録</Link>
          </Button>
        }
      />
      <SearchFilterBar
        searchValue={searchInput}
        searchPlaceholder="名前、メール、部署、役職で検索"
        onSearchValueChange={setSearchInput}
        onSearch={handleSearch}
      >
        <Select value={activeFilter} onValueChange={handleActiveFilterChange}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="状態" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="active">有効</SelectItem>
              <SelectItem value="inactive">無効</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          value={membershipFilter}
          onValueChange={(value) => {
            setMembershipFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="組織への所属" className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">所属を問わず表示</SelectItem>
              <SelectItem value="unassigned">有効な組織所属なし</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </SearchFilterBar>
      {error ? (
        <DataLoadError resourceName="ユーザー" onRetry={() => void refetch()} />
      ) : (
        <UsersTable users={users} isLoading={isLoading} />
      )}
      {!error ? (
        <DataPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          currentCount={users.length}
          isFetching={isFetching}
          isLoading={isLoading}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}

const getIsActiveParam = (value: string) => {
  if (value === "active") {
    return true;
  }

  if (value === "inactive") {
    return false;
  }

  return undefined;
};

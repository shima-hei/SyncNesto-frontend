"use client";

import { useState } from "react";
import Link from "next/link";

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

const PAGE_SIZE = 20;

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const isActive = getIsActiveParam(activeFilter);
  const { users, total, isLoading, isFetching } = useUsers({
    page,
    page_size: PAGE_SIZE,
    q: q || undefined,
    is_active: isActive,
  });

  const handleSearch = () => {
    setPage(1);
    setQ(searchInput.trim());
  };

  const handleActiveFilterChange = (value: string) => {
    setPage(1);
    setActiveFilter(value);
  };

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">ユーザー一覧</h2>
        <p className="text-sm text-muted-foreground">
          システムに登録されているユーザーを管理します。
        </p>
      </div>
      <div>
        <Button asChild>
          <Link href="/system/users/new">ユーザー登録</Link>
        </Button>
      </div>
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
      </SearchFilterBar>
      <UsersTable users={users} isLoading={isLoading} />
      <DataPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        currentCount={users.length}
        isFetching={isFetching}
        isLoading={isLoading}
        onPageChange={setPage}
      />
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

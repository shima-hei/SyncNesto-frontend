"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useUsers } from "../hooks/use-users";
import { UsersTable } from "./users-table";

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
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <form
          className="flex w-full flex-col gap-2 sm:flex-row md:max-w-xl"
          onSubmit={handleSearch}
        >
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="名前、メール、部署、役職で検索"
          />
          <Button type="submit" variant="outline">
            <SearchIcon data-icon="inline-start" />
            検索
          </Button>
        </form>
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
      </div>
      <UsersTable users={users} isLoading={isLoading} />
      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          {total}件中 {users.length}件を表示
          {isFetching && !isLoading ? "・更新中" : ""}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            前へ
          </Button>
          <span>
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          >
            次へ
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </div>
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

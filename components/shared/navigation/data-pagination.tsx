"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type DataPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  currentCount: number;
  isFetching?: boolean;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
};

export function DataPagination({
  page,
  pageSize,
  total,
  currentCount,
  isFetching = false,
  isLoading = false,
  onPageChange,
}: DataPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        {total}件中 {currentCount}件を表示
        {isFetching && !isLoading ? "・更新中" : ""}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
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
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          次へ
          <ChevronRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

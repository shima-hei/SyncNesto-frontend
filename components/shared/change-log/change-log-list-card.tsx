import type { ReactNode } from "react";

import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ChangeLogListCardProps<TItem> = {
  title: string;
  items: TItem[];
  isLoading: boolean;
  renderItem: (item: TItem) => ReactNode;
  emptyMessage?: string;
  loadingFallback?: ReactNode;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    currentCount: number;
    isFetching: boolean;
    onPageChange: (page: number) => void;
  };
};

export function ChangeLogListCard<TItem>({
  title,
  items,
  isLoading,
  renderItem,
  emptyMessage = "変更履歴はありません。",
  loadingFallback,
  pagination,
}: ChangeLogListCardProps<TItem>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex max-h-[640px] flex-col gap-4 overflow-y-auto">
        {isLoading ? (
          (loadingFallback ?? (
            <p className="text-sm text-muted-foreground">
              変更履歴を読み込み中です。
            </p>
          ))
        ) : items.length ? (
          <div className="flex flex-col gap-3">{items.map(renderItem)}</div>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}

        {pagination ? (
          <DataPagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            currentCount={pagination.currentCount}
            isFetching={pagination.isFetching}
            isLoading={isLoading}
            onPageChange={pagination.onPageChange}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { SearchFilterBar } from "@/components/shared/filters/search-filter-bar";
import { PageHeader } from "@/components/shared/layout/page-header";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { TableEmptyRow } from "@/components/shared/tables/table-empty-row";
import { TableListSkeleton } from "@/components/shared/tables/table-list-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import {
  listTrashProjectsProjectIdTrashGet as listTrash,
  restoreTrashProjectsProjectIdTrashKindResourceIdRestorePost as restoreTrash,
} from "@/lib/api/generated/trash/trash";
import type { TrashItem, TrashKind } from "@/lib/api/generated/model";
import { ApiError } from "@/lib/api/error";
import { formatDateTime } from "@/lib/format/date";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";
import { restoredHref, TRASH_LABELS } from "../../lib/trash";

export function TrashPage({ projectId }: { projectId: number }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<TrashKind | "all">("all");
  const [restoring, setRestoring] = useState<TrashItem | null>(null);
  const [restored, setRestored] = useState<TrashItem | null>(null);
  const { tenant } = useTenant();
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ["trash", tenant?.id, projectId, kind, page, q],
    queryFn: ({ signal }) =>
      listTrash(
        projectId,
        { page, page_size: 20, q, kind: kind === "all" ? undefined : kind },
        { signal },
      ),
  });
  const mutation = useMutation({
    mutationFn: (item: TrashItem) =>
      restoreTrash(projectId, item.kind, item.id, {
        deleted_at: item.deleted_at,
        version: item.version,
      }),
    onSuccess: async (_, item) => {
      setRestoring(null);
      setRestored(item);
      toast.success("復元しました。");
      // 詳細・関連・検索も復元後の状態で取り直す。
      await cache.invalidateQueries();
    },
    onError: async (error) => {
      toast.error(getApiErrorMessage(error));
      if (error instanceof ApiError && [403, 404, 409].includes(error.status)) {
        setRestoring(null);
        await query.refetch();
      }
    },
  });
  const items = query.data?.items ?? [];
  const href = restored ? restoredHref(projectId, restored) : null;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="ごみ箱"
        description="操作権限のある削除データを復元できます。親を復元しても、個別に削除した子データはそのまま残ります。"
      />
      {query.data ? (
        <p className="text-sm text-muted-foreground">
          {query.data.retention_days
            ? `削除から${query.data.retention_days}日間は復元できます。保持期限後は復元できず、回収処理の対象になります。`
            : "削除データの保持期限はありません。"}
          デモのデータはログアウト・セッション切れで破棄されます。
        </p>
      ) : null}
      {href ? (
        <Button asChild variant="outline" className="w-fit">
          <Link href={href}>復元したデータを開く</Link>
        </Button>
      ) : null}
      <SearchFilterBar
        searchValue={search}
        searchLabel="削除データを検索"
        searchPlaceholder="名前で検索"
        searchMaxLength={200}
        onSearchValueChange={setSearch}
        onSearch={() => {
          setPage(1);
          setQ(search.trim());
        }}
      >
        <Field>
          <FieldLabel htmlFor="trash-kind">種類</FieldLabel>
          <Select
            value={kind}
            onValueChange={(value) => {
              setKind(value as TrashKind | "all");
              setPage(1);
            }}
          >
            <SelectTrigger id="trash-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">すべての種類</SelectItem>
                {Object.entries(TRASH_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </SearchFilterBar>
      {query.error ? (
        <DataLoadError
          resourceName="ごみ箱"
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {query.isPending ? (
            <TableListSkeleton widths={["w-48", "w-24", "w-24"]} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>削除データ</TableHead>
                  <TableHead className="hidden md:table-cell">
                    削除日時
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    保持期限
                  </TableHead>
                  <TableHead>復元</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length ? (
                  items.map((item) => (
                    <TableRow key={`${item.kind}:${item.id}`}>
                      <TableCell className="whitespace-normal">
                        <div className="flex min-w-0 flex-col items-start gap-1">
                          <span className="font-medium break-all">
                            {item.title}
                          </span>
                          <Badge variant="secondary">
                            {TRASH_LABELS[item.kind]}
                          </Badge>
                          <span className="text-xs text-muted-foreground md:hidden">
                            削除 {formatDateTime(item.deleted_at)}
                            <br />
                            保持期限{" "}
                            {item.expires_at
                              ? formatDateTime(item.expires_at)
                              : "期限なし"}
                          </span>
                          {item.blocked_reason ? (
                            <span className="text-sm text-muted-foreground">
                              {item.blocked_reason}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatDateTime(item.deleted_at)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {item.expires_at
                          ? formatDateTime(item.expires_at)
                          : "期限なし"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!item.can_restore || mutation.isPending}
                          aria-label={`${item.title}を復元`}
                          onClick={() => setRestoring(item)}
                        >
                          <RotateCcwIcon data-icon="inline-start" />
                          復元
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableEmptyRow
                    colSpan={4}
                    message="権限の範囲内に、条件に一致する削除データはありません。"
                  />
                )}
              </TableBody>
            </Table>
          )}
          <DataPagination
            page={page}
            pageSize={20}
            total={query.data?.total ?? 0}
            currentCount={items.length}
            isFetching={query.isFetching}
            isLoading={query.isPending}
            onPageChange={setPage}
          />
        </>
      )}
      <ConfirmDialog
        open={Boolean(restoring)}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setRestoring(null);
        }}
        title="削除データを復元しますか"
        description={`${restoring?.title ?? "データ"}を元の場所に戻します。個別に削除した子データは復元されません。`}
        confirmLabel="復元"
        isPending={mutation.isPending}
        onConfirm={async () => {
          if (restoring)
            await mutation.mutateAsync(restoring).catch(() => undefined);
        }}
      />
    </div>
  );
}

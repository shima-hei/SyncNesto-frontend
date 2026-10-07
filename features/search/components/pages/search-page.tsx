"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/layout/page-header";
import { SearchFilterBar } from "@/components/shared/filters/search-filter-bar";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { TableListSkeleton } from "@/components/shared/tables/table-list-skeleton";
import { TableEmptyRow } from "@/components/shared/tables/table-empty-row";
import { Field, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { searchResourcesSearchGet as searchResources } from "@/lib/api/generated/search/search";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import {
  matchingParts,
  searchCategories,
  searchHref,
  searchKindLabels,
  searchResultHref,
  type SearchCategory,
  type SearchState,
} from "../../lib/search";
import { SearchProjectSelect } from "../shared/search-project-select";

function MatchText({ text, q }: { text: string; q: string }) {
  return matchingParts(text, q).map((part, index) =>
    part.match ? (
      <mark key={index} className="rounded-sm bg-primary/10 text-foreground">
        {part.text}
      </mark>
    ) : (
      <span key={index}>{part.text}</span>
    ),
  );
}

export function SearchPage({ state }: { state: SearchState }) {
  const router = useRouter();
  const { tenant } = useTenant();
  const [input, setInput] = useState(state.q);
  const query = useQuery({
    queryKey: ["resource-search", tenant?.id, state],
    queryFn: ({ signal }) =>
      searchResources(
        {
          q: state.q,
          category: state.category,
          project_id: state.projectId,
          page: state.page,
          page_size: 20,
        },
        { signal },
      ),
    enabled: Boolean(state.q),
    retry: false,
  });
  const navigate = (changes: Partial<SearchState>) =>
    router.push(searchHref({ ...state, page: 1, ...changes }), {
      scroll: false,
    });
  const items = query.data?.items ?? [];
  const counts = query.data?.counts;
  const totalBeforeFilter = counts
    ? Object.values(counts).reduce((sum, n) => sum + n, 0)
    : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="横断検索"
        description="参加プロジェクトの要件・タスク・テスト・ドキュメントをまとめて探します。"
      />
      <SearchFilterBar
        searchValue={input}
        searchLabel="キーワード"
        searchMaxLength={200}
        searchPlaceholder="名前・コード・本文で検索（200文字まで）"
        onSearchValueChange={setInput}
        onSearch={() => navigate({ q: input.trim().slice(0, 200) })}
      >
        <Field>
          <FieldLabel htmlFor="search-category">種類</FieldLabel>
          <Select
            value={state.category ?? "all"}
            onValueChange={(value) =>
              navigate({
                category:
                  value === "all" ? undefined : (value as SearchCategory),
              })
            }
          >
            <SelectTrigger id="search-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">
                  すべて
                  {totalBeforeFilter !== undefined
                    ? `（${totalBeforeFilter}）`
                    : ""}
                </SelectItem>
                {searchCategories.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                    {counts ? `（${counts[value]}）` : ""}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="search-project">プロジェクト</FieldLabel>
          <SearchProjectSelect
            value={state.projectId}
            onChange={(projectId) => navigate({ projectId })}
          />
        </Field>
      </SearchFilterBar>
      <p className="text-xs text-muted-foreground">
        閲覧できる最新のデータを検索します。削除済みデータ・履歴・コメント・添付ファイルの中身は対象外です。
      </p>
      {!state.q ? (
        <EmptyState message="キーワードを入力して検索してください。日本語の本文や業務コードでも探せます。" />
      ) : query.isError ? (
        <DataLoadError
          resourceName="検索結果"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : (
        <section
          aria-label="検索結果"
          aria-busy={query.isFetching}
          className="flex min-w-0 flex-col gap-3"
        >
          <p role="status" aria-live="polite" className="text-sm">
            {query.isPending
              ? "検索中…"
              : `「${state.q}」の検索結果：${query.data?.total ?? 0}件`}
          </p>
          {query.isPending ? (
            <TableListSkeleton widths={["w-48", "w-28"]} />
          ) : (
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead>検索結果</TableHead>
                  <TableHead className="hidden w-52 md:table-cell">
                    プロジェクト
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length ? (
                  items.map((item) => (
                    <TableRow key={`${item.kind}:${item.id}`}>
                      <TableCell className="whitespace-normal">
                        <div className="flex min-w-0 flex-col gap-1.5 py-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                              {searchKindLabels[item.kind]}
                            </Badge>
                            {item.code ? (
                              <span className="break-all text-xs text-muted-foreground">
                                <MatchText text={item.code} q={state.q} />
                              </span>
                            ) : null}
                          </div>
                          <Link
                            prefetch={false}
                            className="break-words font-medium hover:underline"
                            href={searchResultHref(item)}
                          >
                            <MatchText text={item.title} q={state.q} />
                          </Link>
                          {item.excerpt ? (
                            <p className="line-clamp-3 break-words text-sm text-muted-foreground">
                              <MatchText text={item.excerpt} q={state.q} />
                            </p>
                          ) : null}
                          <Link
                            prefetch={false}
                            className="break-words text-xs text-muted-foreground hover:underline md:hidden"
                            href={`/projects/joined/${item.project_id}`}
                          >
                            {item.project_name} · {item.project_code}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="hidden whitespace-normal md:table-cell">
                        <Link
                          prefetch={false}
                          className="break-words hover:underline"
                          href={`/projects/joined/${item.project_id}`}
                        >
                          {item.project_name}
                        </Link>
                        <p className="break-all text-xs text-muted-foreground">
                          {item.project_code}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableEmptyRow
                    colSpan={2}
                    message="条件に一致するデータがありません。キーワードや絞り込み条件を変更してください。"
                  />
                )}
              </TableBody>
            </Table>
          )}
          <DataPagination
            page={state.page}
            pageSize={20}
            total={query.data?.total ?? 0}
            currentCount={items.length}
            isFetching={query.isFetching}
            isLoading={query.isPending}
            onPageChange={(page) => navigate({ page: Math.min(page, 500) })}
          />
          {state.page >= 500 ? (
            <p className="text-xs text-muted-foreground">
              表示上限に達しました。キーワード・種類・プロジェクトで条件を絞ってください。
            </p>
          ) : null}
          {state.category || state.projectId ? (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() =>
                navigate({ category: undefined, projectId: undefined })
              }
            >
              絞り込みを解除
            </Button>
          ) : null}
        </section>
      )}
    </div>
  );
}

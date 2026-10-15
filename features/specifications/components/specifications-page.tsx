"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/layout/page-header";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { canCreateDocument } from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { formatDateTime } from "@/lib/format/date";
import { listSpecifications } from "../lib/api";
import {
  kindLabels,
  specificationCode,
  specificationHref,
  specificationKeys,
  statusLabels,
} from "../lib/specification";

export function SpecificationsPage({ projectId }: { projectId: number }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rawKind = params.get("kind");
  const kind = rawKind === "api" || rawKind === "screen" ? rawKind : undefined;
  const requestedPage = Number(params.get("page"));
  const page =
    Number.isSafeInteger(requestedPage) &&
    requestedPage > 0 &&
    requestedPage <= 10000
      ? requestedPage
      : 1;
  const q = (params.get("q") ?? "").slice(0, 200);
  const [search, setSearch] = useState(q);
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const query = useQuery({
    queryKey: [...specificationKeys.all(projectId), kind, page, q],
    queryFn: () =>
      listSpecifications(projectId, { kind, page, page_size: 20, q }),
    retry: false,
  });
  const navigate = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  const canCreate = canCreateDocument(currentProjectRole);
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader
        title="画面・API設計"
        description="要件を、画面の振る舞いとAPIの入出力に具体化します。設計した内容はタスク・テスト項目とつなげて確認できます。"
        actions={
          canCreate ? (
            <>
              <Button asChild variant="outline">
                <Link href={`${specificationHref(projectId)}/new?kind=screen`}>
                  画面を設計
                </Link>
              </Button>
              <Button asChild>
                <Link href={`${specificationHref(projectId)}/new?kind=api`}>
                  APIを設計
                </Link>
              </Button>
            </>
          ) : undefined
        }
      />
      <Tabs
        value={kind ?? "all"}
        onValueChange={(value) =>
          navigate({ kind: value === "all" ? "" : value, page: "" })
        }
      >
        <TabsList variant="line">
          <TabsTrigger value="all">すべて</TabsTrigger>
          <TabsTrigger value="screen">画面設計書</TabsTrigger>
          <TabsTrigger value="api">API設計書</TabsTrigger>
        </TabsList>
      </Tabs>
      <form
        className="flex max-w-xl gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          navigate({ q: search.trim(), page: "" });
        }}
      >
        <Input
          aria-label="設計書を検索"
          name="q"
          value={search}
          maxLength={200}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="名前・目的で検索…"
        />
        <Button type="submit" variant="outline">
          検索
        </Button>
        {q && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearch("");
              navigate({ q: "", page: "" });
            }}
          >
            解除
          </Button>
        )}
      </form>
      {query.isPending ? (
        <p role="status">設計書を読み込み中…</p>
      ) : query.error ? (
        <DataLoadError
          resourceName="設計書"
          isRetrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      ) : query.data?.items.length ? (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>設計書</TableHead>
                  <TableHead>種類</TableHead>
                  <TableHead>確認状況</TableHead>
                  <TableHead>更新</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        className="font-medium underline-offset-4 hover:underline"
                        href={specificationHref(projectId, row.id)}
                      >
                        {row.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {specificationCode(row)}
                      </p>
                    </TableCell>
                    <TableCell>{kindLabels[row.kind]}</TableCell>
                    <TableCell>{statusLabels[row.status]}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDateTime(row.updated_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DataPagination
            page={page}
            pageSize={20}
            total={query.data.total}
            currentCount={query.data.items.length}
            isFetching={query.isFetching}
            isLoading={query.isPending}
            onPageChange={(next) => navigate({ page: String(next) })}
          />
        </>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {q
                ? "条件に合う設計書はありません"
                : "要件から設計を始めましょう"}
            </EmptyTitle>
            <EmptyDescription>
              {q
                ? "検索する言葉や種類を変えてください。"
                : "画面なら入力項目と操作、APIなら入出力と権限から整理します。名前だけで下書きを保存し、チームで補っていけます。"}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}

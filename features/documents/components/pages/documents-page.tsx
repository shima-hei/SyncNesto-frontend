"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/layout/page-header";
import { SearchFilterBar } from "@/components/shared/filters/search-filter-bar";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { TableListSkeleton } from "@/components/shared/tables/table-list-skeleton";
import { TableEmptyRow } from "@/components/shared/tables/table-empty-row";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canCreateDocument } from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { listDocumentsProjectsProjectIdDocumentsGet as listDocuments } from "@/lib/api/generated/documents/documents";
import { formatDateTime } from "@/lib/format/date";
import { documentKeys, documentsHref } from "../../lib/document";
import { DocumentLoadError } from "../shared/document-feedback";

export function DocumentsPage({ projectId }: { projectId: number }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const query = useQuery({
    queryKey: [...documentKeys.all(projectId), "list", page, q],
    queryFn: () =>
      listDocuments(projectId, { page, page_size: 20, q: q || undefined }),
  });
  const items = query.data?.items ?? [];
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="ドキュメント"
        description="作業ガイドや議事録を、本文・添付・関連する業務とまとめて管理します。"
        actions={
          canCreateDocument(currentProjectRole) ? (
            <Button asChild>
              <Link href={`${documentsHref(projectId)}/new`}>
                <PlusIcon data-icon="inline-start" />
                ドキュメント登録
              </Link>
            </Button>
          ) : null
        }
      />
      <SearchFilterBar
        searchValue={search}
        searchLabel="ドキュメントを検索"
        searchPlaceholder="タイトル・本文で検索"
        onSearchValueChange={setSearch}
        onSearch={() => {
          setPage(1);
          setQ(search.trim().slice(0, 200));
        }}
      />
      {query.error ? (
        <DocumentLoadError
          error={query.error}
          projectId={projectId}
          retry={() => void query.refetch()}
        />
      ) : (
        <>
          {query.isPending ? (
            <TableListSkeleton widths={["w-48", "w-16", "w-28"]} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ドキュメント</TableHead>
                  <TableHead>版</TableHead>
                  <TableHead>更新日時</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length ? (
                  items.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>
                        <Link
                          className="font-medium hover:underline break-words"
                          href={documentsHref(projectId, document.id)}
                        >
                          {document.title}
                        </Link>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {document.version}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatDateTime(document.updated_at)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableEmptyRow
                    colSpan={3}
                    message={
                      q
                        ? "条件に一致するドキュメントがありません。"
                        : "ドキュメントがありません。登録するとチームで共有できます。"
                    }
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
    </div>
  );
}

"use client";

import { useUrlFilterState } from "@/hooks/use-url-filter-state";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { SearchFilterBar } from "@/components/shared/filters/search-filter-bar";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { PageHeader } from "@/components/shared/layout/page-header";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { canCreateRequirement } from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";

import { REQUIREMENT_DOCUMENT_STATUS_OPTIONS } from "../../constants/requirement-options";
import { useRequirementDocuments } from "../../hooks/use-requirement-documents";
import { RequirementDocumentsTable } from "../tables/requirement-documents-table";
import { useRequirementEntry } from "../../hooks/use-requirement-entry";
import { isRequirementSmartEntry } from "../../lib/requirement-entry";

const PAGE_SIZE = 20;
const ALL_STATUSES = "all";

type RequirementDocumentsPageProps = {
  projectId: number;
};

export function RequirementDocumentsPage({
  projectId,
}: RequirementDocumentsPageProps) {
  const router = useRouter();
  const params = useSearchParams();
  const smart = isRequirementSmartEntry(new URLSearchParams(params));
  const entry = useRequirementEntry(projectId, smart);
  const [page, setPage] = useUrlFilterState("page", 1);
  const [q, setQ] = useUrlFilterState("q", "");
  const [searchInput, setSearchInput] = useState(q);
  const [status, setStatus] = useUrlFilterState("status", ALL_STATUSES);
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const { documents, total, isLoading, isFetching, error, refetch } =
    useRequirementDocuments(
      projectId,
      {
        page,
        page_size: PAGE_SIZE,
        q: q || undefined,
        status: status === ALL_STATUSES ? undefined : status,
      },
      !smart || entry.kind === "multiple",
    );

  const singleId = entry.kind === "single" ? entry.documentId : null;
  useEffect(() => {
    if (smart && singleId !== null)
      router.replace(
        `/projects/joined/${projectId}/requirements/${singleId}?tab=requirements`,
      );
  }, [smart, singleId, projectId, router]);

  const handleSearch = () => {
    setPage(1);
    setQ(searchInput.trim());
  };

  const handleStatusChange = (value: string) => {
    setPage(1);
    setStatus(value);
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="要件定義"
        description="プロジェクトの要件定義書と要件を管理します。"
        actions={
          canCreateRequirement(currentProjectRole) ? (
            <Button asChild>
              <Link href={`/projects/joined/${projectId}/requirements/new`}>
                要件定義書登録
              </Link>
            </Button>
          ) : null
        }
      />
      {smart && entry.kind !== "multiple" ? (
        entry.kind === "error" ? (
          <DataLoadError
            resourceName="要件定義書"
            isRetrying={entry.isFetching}
            onRetry={() => void entry.refetch()}
          />
        ) : entry.kind === "empty" ? (
          <EmptyState
            message={
              canCreateRequirement(currentProjectRole)
                ? "要件定義書はまだありません。「要件定義書登録」から最初の1冊を作成できます。"
                : "要件定義書はまだありません。作成権限のあるメンバーへ相談してください。"
            }
          />
        ) : (
          <Skeleton className="h-24" />
        )
      ) : (
        <>
          <SearchFilterBar
            searchValue={searchInput}
            searchLabel="要件定義書を検索"
            searchPlaceholder="タイトル、コード、目的で検索"
            onSearchValueChange={setSearchInput}
            onSearch={handleSearch}
          >
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger
                className="w-full sm:w-40"
                aria-label="ステータスで絞り込み"
              >
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ALL_STATUSES}>すべて</SelectItem>
                  {REQUIREMENT_DOCUMENT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </SearchFilterBar>
          {error && !isLoading ? (
            <DataLoadError
              resourceName="要件定義書"
              isRetrying={isFetching}
              onRetry={() => void refetch()}
            />
          ) : (
            <>
              <RequirementDocumentsTable
                projectId={projectId}
                documents={documents}
                isLoading={isLoading}
              />
              <DataPagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                currentCount={documents.length}
                isFetching={isFetching}
                isLoading={isLoading}
                onPageChange={setPage}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

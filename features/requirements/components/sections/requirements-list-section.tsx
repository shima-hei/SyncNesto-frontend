"use client";

import { useWorkbenchState } from "../../hooks/use-workbench-state";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";

import { useUrlFilterState } from "@/hooks/use-url-filter-state";
import { FormApiError } from "@/components/shared/forms/form-api-error";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Button } from "@/components/ui/button";
import type { RequirementRead } from "@/lib/api/generated/model";
import { requirementTestCoverageProjectsProjectIdRequirementTestCoverageGet as readCoverage } from "@/lib/api/generated/test-collaboration/test-collaboration";

import {
  ALL_REQUIREMENT_PRIORITIES,
  ALL_REQUIREMENT_STATUSES,
  ALL_REQUIREMENT_TYPES,
  REQUIREMENT_SORT_OPTIONS,
} from "../../constants/requirement-view-options";
import { useRequirementSections } from "../../hooks/use-requirement-sections";
import { useRequirements } from "../../hooks/use-requirements";
import type { RequirementReviewTargetAnchor } from "../../lib/requirement-review-anchor";
import { RequirementsListFilters } from "../filters/requirements-list-filters";
import { RequirementsTable } from "../tables/requirements-table";

const PAGE_SIZE = 20;

type RequirementsListSectionProps = {
  projectId: number;
  documentId: number;
  sectionId?: number | null;
  canCreate: boolean;
  canUpdate: boolean;
  selectedRequirementId?: number | null;
  targetAnchors?: RequirementReviewTargetAnchor[];
  activeAnchorKey?: string | null;
  onSelectRequirement?: (requirement: RequirementRead) => void;
  onSelectReviewAnchor?: (
    requirement: RequirementRead,
    targetAnchor: RequirementReviewTargetAnchor,
  ) => void;
};

export function RequirementsListSection({
  projectId,
  documentId,
  sectionId,
  canCreate,
  canUpdate,
  selectedRequirementId,
  targetAnchors = [],
  activeAnchorKey = null,
  onSelectRequirement,
  onSelectReviewAnchor,
}: RequirementsListSectionProps) {
  const { sections } = useRequirementSections(projectId, documentId);
  const [page, setPage] = useUrlFilterState("page", 1);
  const [q, setQ] = useUrlFilterState("q", "");
  const [searchInput, setSearchInput] = useWorkbenchState(
    `search:${sectionId ?? "all"}`,
    q,
  );
  const [status, setStatus] = useUrlFilterState(
    "status",
    ALL_REQUIREMENT_STATUSES,
  );
  const [requirementType, setRequirementType] = useUrlFilterState(
    "requirementType",
    ALL_REQUIREMENT_TYPES,
  );
  const [priority, setPriority] = useUrlFilterState(
    "priority",
    ALL_REQUIREMENT_PRIORITIES,
  );
  const [ownerId, setOwnerId] = useUrlFilterState<number | null>(
    "ownerId",
    null,
  );
  const [sort, setSort] = useUrlFilterState<
    (typeof REQUIREMENT_SORT_OPTIONS)[number]["value"]
  >("sort", "updated_desc");
  const { requirements, total, isLoading, isFetching, error } = useRequirements(
    projectId,
    {
      page,
      page_size: PAGE_SIZE,
      document_id: documentId,
      section_id: sectionId ?? undefined,
      q: q || undefined,
      status: status === ALL_REQUIREMENT_STATUSES ? undefined : status,
      requirement_type:
        requirementType === ALL_REQUIREMENT_TYPES ? undefined : requirementType,
      priority: priority === ALL_REQUIREMENT_PRIORITIES ? undefined : priority,
      owner_id: ownerId ?? undefined,
      sort,
    },
  );
  const coverage = useQuery({
    queryKey: ["requirement-test-coverage", projectId, documentId],
    queryFn: () => readCoverage(projectId, { document_id: documentId }),
  });
  const coverageByRequirement = Object.fromEntries(
    (coverage.data ?? []).map((row) => [
      row.requirement_id,
      row.linked_item_count,
    ]),
  );
  const selectedSection = sections.find((section) => section.id === sectionId);
  const createHref = sectionId
    ? `/projects/joined/${projectId}/requirements/${documentId}/items/new?sectionId=${sectionId}`
    : `/projects/joined/${projectId}/requirements/${documentId}/items/new`;

  const handleSearch = () => {
    setPage(1);
    setQ(searchInput.trim());
  };

  const handleStatusChange = (value: string) => {
    setPage(1);
    setStatus(value);
  };

  const handleTypeChange = (value: string) => {
    setPage(1);
    setRequirementType(value);
  };

  const handlePriorityChange = (value: string) => {
    setPage(1);
    setPriority(value);
  };

  const handleOwnerChange = (value: number | null) => {
    setPage(1);
    setOwnerId(value);
  };

  const handleSortChange = (value: string) => {
    setPage(1);
    setSort(value as typeof sort);
  };

  return (
    <div
      className="flex flex-col gap-4"
      data-workbench-list-ready={!isLoading && !isFetching}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">要件一覧</h3>
          <p className="text-sm text-muted-foreground">
            {selectedSection
              ? `追加先: ${selectedSection.title}`
              : "全セクションの要件を表示しています。追加した要件はセクション未設定になります。"}
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href={createHref}>
              <PlusIcon data-icon="inline-start" />
              要件を追加
            </Link>
          </Button>
        ) : null}
      </div>
      <RequirementsListFilters
        projectId={projectId}
        searchInput={searchInput}
        status={status}
        requirementType={requirementType}
        priority={priority}
        ownerId={ownerId}
        sort={sort}
        onSearchInputChange={setSearchInput}
        onSearch={handleSearch}
        onStatusChange={handleStatusChange}
        onTypeChange={handleTypeChange}
        onPriorityChange={handlePriorityChange}
        onOwnerChange={handleOwnerChange}
        onSortChange={handleSortChange}
      />
      {error ? (
        <FormApiError error={error} />
      ) : !isLoading &&
        total === 0 &&
        !q &&
        status === ALL_REQUIREMENT_STATUSES &&
        requirementType === ALL_REQUIREMENT_TYPES &&
        priority === ALL_REQUIREMENT_PRIORITIES &&
        ownerId === null ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>最初の要件を書きましょう</EmptyTitle>
            <EmptyDescription>
              誰が、どの場面で、何をできる必要があるかを1件ずつ書きます。未確定なら、未決事項として相談してから要件にできます。セクション分けは後からできます。
            </EmptyDescription>
          </EmptyHeader>
          {canCreate && (
            <EmptyContent className="flex-row flex-wrap justify-center">
              <Button asChild>
                <Link href={createHref}>最初の要件を書く</Link>
              </Button>
              <Button asChild variant="outline">
                <Link
                  href={`/projects/joined/${projectId}/requirements/${documentId}?tab=issues`}
                >
                  未決事項を相談する
                </Link>
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <RequirementsTable
          projectId={projectId}
          documentId={documentId}
          requirements={requirements}
          coverageByRequirement={coverageByRequirement}
          coverageState={
            coverage.isPending
              ? "loading"
              : coverage.isError
                ? "error"
                : "ready"
          }
          isLoading={isLoading}
          canUpdate={canUpdate}
          selectedRequirementId={selectedRequirementId}
          targetAnchors={targetAnchors}
          activeAnchorKey={activeAnchorKey}
          onSelectRequirement={onSelectRequirement}
          onSelectReviewAnchor={onSelectReviewAnchor}
        />
      )}
      <DataPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        currentCount={requirements.length}
        isFetching={isFetching}
        isLoading={isLoading}
        onPageChange={setPage}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Button } from "@/components/ui/button";
import type { RequirementRead } from "@/lib/api/generated/model";

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
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(ALL_REQUIREMENT_STATUSES);
  const [requirementType, setRequirementType] = useState(ALL_REQUIREMENT_TYPES);
  const [priority, setPriority] = useState(ALL_REQUIREMENT_PRIORITIES);
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [sort, setSort] =
    useState<(typeof REQUIREMENT_SORT_OPTIONS)[number]["value"]>(
      "updated_desc",
    );
  const { requirements, total, isLoading, isFetching } = useRequirements(
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">要件一覧</h3>
          <p className="text-sm text-muted-foreground">
            配置先: {selectedSection?.title ?? "セクション未設定"}
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href={createHref}>
              <PlusIcon data-icon="inline-start" />
              この配置先に要件を追加
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
      <RequirementsTable
        projectId={projectId}
        documentId={documentId}
        requirements={requirements}
        isLoading={isLoading}
        canUpdate={canUpdate}
        selectedRequirementId={selectedRequirementId}
        targetAnchors={targetAnchors}
        activeAnchorKey={activeAnchorKey}
        onSelectRequirement={onSelectRequirement}
        onSelectReviewAnchor={onSelectReviewAnchor}
      />
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

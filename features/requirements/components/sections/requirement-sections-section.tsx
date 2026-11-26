"use client";

import { UNCLASSIFIED_SECTION_ID } from "../../constants/requirement-view-options";

import { useId, useState } from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useCreateRequirementSection } from "../../hooks/use-create-requirement-section";
import { useRequirementSections } from "../../hooks/use-requirement-sections";
import { useUpdateRequirementSectionSortOrder } from "../../hooks/use-update-requirement-section-sort-order";
import { RequirementSectionSkeleton } from "../shared/requirement-section-skeleton";
import { RequirementSectionCreateDialog } from "./section-list/requirement-section-create-dialog";
import { RequirementSectionListItem } from "./section-list/requirement-section-list-item";

type RequirementSectionsSectionProps = {
  projectId: number;
  documentId: number;
  canUpdate: boolean;
  selectedSectionId?: number | null;
  onSelectSection?: (sectionId: number | null) => void;
  includeUnclassified?: boolean;
  itemCounts?: import("@/lib/api/generated/model").RequirementItemCounts;
  layout?: "list" | "compact" | "navigation";
};

export function RequirementSectionsSection({
  projectId,
  documentId,
  canUpdate,
  selectedSectionId,
  onSelectSection,
  includeUnclassified = false,
  itemCounts,
  layout = "list",
}: RequirementSectionsSectionProps) {
  const sectionSelectId = useId();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [reordering, setReordering] = useState(false);
  const navigationId = useId();
  const { sections, isLoading } = useRequirementSections(projectId, documentId);
  const {
    createRequirementSection,
    isPending: isCreatePending,
    error: createError,
  } = useCreateRequirementSection(projectId, documentId);
  const { moveRequirementSection, isPending: isSortPending } =
    useUpdateRequirementSectionSortOrder(projectId, documentId);
  const sortedSections = sections
    .slice()
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0));
  const countsBySection = new Map(
    itemCounts?.sections.map((item) => [item.section_id, item.count]),
  );
  const nextSortOrder =
    Math.max(0, ...sections.map((section) => section.sort_order ?? 0)) + 10;

  const sectionList = isLoading ? (
    <RequirementSectionSkeleton />
  ) : sections.length ? (
    <div
      className={cn(
        layout === "compact" && "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
        layout === "list" && "flex flex-col gap-3",
        layout === "navigation" && "flex flex-col gap-1",
      )}
    >
      {sortedSections.map((section, index) => {
        const isSelected = selectedSectionId === section.id;

        return (
          <RequirementSectionListItem
            key={section.id}
            section={section}
            isSelected={isSelected}
            canUpdate={canUpdate && (layout !== "navigation" || reordering)}
            canMoveUp={index > 0}
            canMoveDown={index < sortedSections.length - 1}
            isSortPending={isSortPending}
            showSelectAction={Boolean(onSelectSection)}
            navigation={layout === "navigation"}
            itemCount={
              itemCounts ? (countsBySection.get(section.id) ?? 0) : undefined
            }
            onSelect={onSelectSection ?? undefined}
            onMove={(item, direction) =>
              moveRequirementSection(sortedSections, item.id, direction)
            }
          />
        );
      })}
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">セクションはありません。</p>
  );
  const createButton = canUpdate ? (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => setCreateDialogOpen(true)}
    >
      <PlusIcon data-icon="inline-start" />
      セクション追加
    </Button>
  ) : null;
  const createDialog = (
    <RequirementSectionCreateDialog
      open={createDialogOpen}
      nextSortOrder={nextSortOrder}
      isPending={isCreatePending}
      error={createError}
      onOpenChange={setCreateDialogOpen}
      onSubmit={createRequirementSection}
    />
  );

  if (layout === "navigation" && onSelectSection) {
    return (
      <section
        aria-label="要件定義書の目次"
        className="flex min-w-0 flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">目次</h2>
          {createButton}
        </div>
        <div className="flex flex-col gap-2 @min-[64rem]/requirements:hidden">
          <label htmlFor={sectionSelectId} className="text-sm font-medium">
            章・セクション
          </label>
          <Select
            value={selectedSectionId?.toString() ?? "all"}
            disabled={isLoading}
            onValueChange={(value) =>
              onSelectSection(value === "all" ? null : Number(value))
            }
          >
            <SelectTrigger id={sectionSelectId} className="w-full min-w-0">
              <SelectValue placeholder="章・セクションを選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">
                  すべての要件{itemCounts ? ` (${itemCounts.total})` : ""}
                </SelectItem>
                {sortedSections.map((section) => (
                  <SelectItem key={section.id} value={String(section.id)}>
                    {section.title}
                    {itemCounts
                      ? ` (${countsBySection.get(section.id) ?? 0})`
                      : ""}
                  </SelectItem>
                ))}
                {includeUnclassified ? (
                  <SelectItem value={String(UNCLASSIFIED_SECTION_ID)}>
                    未分類{itemCounts ? ` (${itemCounts.unclassified})` : ""}
                  </SelectItem>
                ) : null}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={navigationOpen}
            aria-controls={navigationId}
            onClick={() => setNavigationOpen((open) => !open)}
          >
            {navigationOpen ? "目次を閉じる" : "目次・並び替えを開く"}
          </Button>
        </div>
        <nav
          id={navigationId}
          aria-label="章・セクション"
          className={cn(
            "flex min-w-0 flex-col gap-3",
            !navigationOpen && "hidden @min-[64rem]/requirements:flex",
          )}
        >
          <Button
            type="button"
            variant={selectedSectionId === null ? "secondary" : "ghost"}
            aria-current={selectedSectionId === null ? "location" : undefined}
            className="justify-between"
            onClick={() => onSelectSection(null)}
          >
            すべての要件
            {itemCounts ? (
              <span className="text-xs tabular-nums text-muted-foreground">
                {itemCounts.total}
              </span>
            ) : null}
          </Button>
          {sectionList}
          {includeUnclassified ? (
            <Button
              type="button"
              variant={
                selectedSectionId === UNCLASSIFIED_SECTION_ID
                  ? "secondary"
                  : "ghost"
              }
              aria-current={
                selectedSectionId === UNCLASSIFIED_SECTION_ID
                  ? "location"
                  : undefined
              }
              className="justify-between"
              onClick={() => onSelectSection(UNCLASSIFIED_SECTION_ID)}
            >
              未分類
              {itemCounts ? (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {itemCounts.unclassified}
                </span>
              ) : null}
            </Button>
          ) : null}
          {canUpdate && sortedSections.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={reordering}
              onClick={() => setReordering(!reordering)}
              className="justify-start"
            >
              {reordering ? "並べ替えを終了" : "章を並べ替える"}
            </Button>
          ) : null}
        </nav>
        {createDialog}
      </section>
    );
  }

  if (layout === "compact" && onSelectSection) {
    return (
      <section
        aria-label="セクション選択"
        className="flex min-w-0 flex-col gap-3 border-b pb-4"
      >
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <label
            htmlFor={sectionSelectId}
            className="shrink-0 text-sm font-medium"
          >
            セクション
          </label>
          <Select
            value={selectedSectionId ? String(selectedSectionId) : "all"}
            disabled={isLoading}
            onValueChange={(value) =>
              onSelectSection(value === "all" ? null : Number(value))
            }
          >
            <SelectTrigger
              id={sectionSelectId}
              className="w-full min-w-0 sm:max-w-sm"
            >
              <SelectValue placeholder="セクションを選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">全セクション</SelectItem>
                {sortedSections.map((section) => (
                  <SelectItem key={section.id} value={String(section.id)}>
                    {section.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className="shrink-0">{createButton}</div>
        </div>
        {sections.length ? (
          <details>
            <summary className="w-fit cursor-pointer rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              {canUpdate ? "セクション一覧・並び替え" : "セクション一覧"}（
              {sections.length}件）
            </summary>
            <div className="mt-3">{sectionList}</div>
          </details>
        ) : null}
        {createDialog}
      </section>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>セクション</CardTitle>
          {createButton}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {onSelectSection ? (
          <Button
            type="button"
            variant={selectedSectionId ? "outline" : "default"}
            onClick={() => onSelectSection(null)}
          >
            全セクション
          </Button>
        ) : null}
        {sectionList}
        {createDialog}
      </CardContent>
    </Card>
  );
}

"use client";

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
import type { RequirementSectionRead } from "@/lib/api/generated/model";
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
  layout?: "list" | "compact";
};

export function RequirementSectionsSection({
  projectId,
  documentId,
  canUpdate,
  selectedSectionId,
  onSelectSection,
  layout = "list",
}: RequirementSectionsSectionProps) {
  const sectionSelectId = useId();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { sections, isLoading } = useRequirementSections(projectId, documentId);
  const {
    createRequirementSection,
    isPending: isCreatePending,
    error: createError,
  } = useCreateRequirementSection(projectId, documentId);
  const { updateRequirementSectionSortOrder, isPending: isSortPending } =
    useUpdateRequirementSectionSortOrder(projectId, documentId);
  const sortedSections = sections
    .slice()
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0));
  const nextSortOrder =
    Math.max(0, ...sections.map((section) => section.sort_order ?? 0)) + 10;

  const moveSection = async (
    section: RequirementSectionRead,
    direction: "up" | "down",
  ) => {
    const currentIndex = sortedSections.findIndex(
      (item) => item.id === section.id,
    );
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= sortedSections.length
    ) {
      return;
    }

    const nextSections = sortedSections.slice();
    const currentSection = nextSections[currentIndex];
    const targetSection = nextSections[nextIndex];

    nextSections[currentIndex] = targetSection;
    nextSections[nextIndex] = currentSection;
    await updateRequirementSectionSortOrder(nextSections);
  };

  const sectionList = isLoading ? (
    <RequirementSectionSkeleton />
  ) : sections.length ? (
    <div
      className={cn(
        layout === "compact" && "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
        layout === "list" && "flex flex-col gap-3",
      )}
    >
      {sortedSections.map((section, index) => {
        const isSelected = selectedSectionId === section.id;

        return (
          <RequirementSectionListItem
            key={section.id}
            section={section}
            isSelected={isSelected}
            canUpdate={canUpdate}
            canMoveUp={index > 0}
            canMoveDown={index < sortedSections.length - 1}
            isSortPending={isSortPending}
            showSelectAction={Boolean(onSelectSection)}
            onSelect={onSelectSection ?? undefined}
            onMove={moveSection}
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

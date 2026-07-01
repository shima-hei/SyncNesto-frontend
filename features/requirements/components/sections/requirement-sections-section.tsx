"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RequirementSectionRead } from "@/lib/api/generated/model";

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
};

export function RequirementSectionsSection({
  projectId,
  documentId,
  canUpdate,
  selectedSectionId,
  onSelectSection,
}: RequirementSectionsSectionProps) {
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>セクション</CardTitle>
          {canUpdate ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setCreateDialogOpen(true)}
            >
              <PlusIcon data-icon="inline-start" />
              追加
            </Button>
          ) : null}
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

        {isLoading ? (
          <RequirementSectionSkeleton />
        ) : sections.length ? (
          <div className="flex flex-col gap-3">
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
          <p className="text-sm text-muted-foreground">
            セクションはありません。
          </p>
        )}

        <RequirementSectionCreateDialog
          open={createDialogOpen}
          nextSortOrder={nextSortOrder}
          isPending={isCreatePending}
          error={createError}
          onOpenChange={setCreateDialogOpen}
          onSubmit={createRequirementSection}
        />
      </CardContent>
    </Card>
  );
}

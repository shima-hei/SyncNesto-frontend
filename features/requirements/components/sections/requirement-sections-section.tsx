"use client";

import { useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  PlusIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RequirementSectionRead } from "@/lib/api/generated/model";

import {
  getRequirementDocumentStatusLabel,
  getRequirementSectionTypeLabel,
} from "../../constants/requirement-options";
import { useCreateRequirementSection } from "../../hooks/use-create-requirement-section";
import { useRequirementSections } from "../../hooks/use-requirement-sections";
import { useUpdateRequirementSectionSortOrder } from "../../hooks/use-update-requirement-section-sort-order";
import { RequirementSectionForm } from "../forms/requirement-section-form";
import { RequirementSectionSkeleton } from "../shared/requirement-section-skeleton";

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
  const {
    updateRequirementSectionSortOrder,
    isPending: isSortPending,
  } = useUpdateRequirementSectionSortOrder(projectId, documentId);
  const sortedSections = sections
    .slice()
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0));
  const nextSortOrder =
    Math.max(0, ...sections.map((section) => section.sort_order ?? 0)) + 10;

  const moveSection = async (
    section: RequirementSectionRead,
    direction: "up" | "down"
  ) => {
    const currentIndex = sortedSections.findIndex((item) => item.id === section.id);
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= sortedSections.length) {
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
                <div
                  key={section.id}
                  data-state={isSelected ? "selected" : undefined}
                  className="rounded-lg border p-3 data-[state=selected]:border-primary"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <button
                        type="button"
                        className="flex min-w-0 flex-col gap-1 text-left"
                        onClick={() => onSelectSection?.(section.id)}
                      >
                        <span className="min-w-0 break-words font-medium">
                          {section.title}
                        </span>
                        <span className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>
                            {getRequirementSectionTypeLabel(section.section_type)}
                          </span>
                          <span>
                            {getRequirementDocumentStatusLabel(section.status)}
                          </span>
                        </span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {onSelectSection ? (
                        <Button
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => onSelectSection(section.id)}
                        >
                          {isSelected ? (
                            <CheckIcon data-icon="inline-start" />
                          ) : null}
                          {isSelected ? "選択中" : "選択"}
                        </Button>
                      ) : null}
                      {canUpdate ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            disabled={index === 0 || isSortPending}
                            onClick={() => moveSection(section, "up")}
                          >
                            <ArrowUpIcon />
                            <span className="sr-only">上へ</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            disabled={
                              index === sortedSections.length - 1 ||
                              isSortPending
                            }
                            onClick={() => moveSection(section, "down")}
                          >
                            <ArrowDownIcon />
                            <span className="sr-only">下へ</span>
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            セクションはありません。
          </p>
        )}

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>セクション追加</DialogTitle>
              <DialogDescription>
                要件を分類するためのセクションを追加します。
              </DialogDescription>
            </DialogHeader>
            <div>
              <RequirementSectionForm
                nextSortOrder={nextSortOrder}
                isPending={isCreatePending}
                error={createError}
                onSubmit={createRequirementSection}
                onSuccess={() => setCreateDialogOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

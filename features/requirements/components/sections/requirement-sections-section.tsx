"use client";

import { useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  EditIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RequirementSectionRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

import {
  getRequirementDocumentStatusLabel,
  getRequirementSectionTypeLabel,
} from "../../constants/requirement-options";
import { useCreateRequirementSection } from "../../hooks/use-create-requirement-section";
import { useDeleteRequirementSection } from "../../hooks/use-delete-requirement-section";
import { useRequirementSections } from "../../hooks/use-requirement-sections";
import { useUpdateRequirementSection } from "../../hooks/use-update-requirement-section";
import { useUpdateRequirementSectionSortOrder } from "../../hooks/use-update-requirement-section-sort-order";
import { RequirementSectionForm } from "../forms/requirement-section-form";
import { RequirementSectionSkeleton } from "../shared/requirement-section-skeleton";
import type { RequirementSectionFormValues } from "../../types/requirement-section-form";

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
  const [deleteTarget, setDeleteTarget] =
    useState<RequirementSectionRead | null>(null);
  const [editingTarget, setEditingTarget] =
    useState<RequirementSectionRead | null>(null);
  const { sections, isLoading } = useRequirementSections(projectId, documentId);
  const {
    createRequirementSection,
    isPending: isCreatePending,
    error: createError,
  } = useCreateRequirementSection(projectId, documentId);
  const { deleteRequirementSection, isPending: isDeletePending } =
    useDeleteRequirementSection(projectId, documentId);
  const {
    updateRequirementSection,
    isPending: isUpdatePending,
    error: updateError,
  } = useUpdateRequirementSection(projectId, documentId);
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
        <CardTitle>セクション</CardTitle>
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

        {canUpdate ? (
          <RequirementSectionForm
            nextSortOrder={nextSortOrder}
            isPending={isCreatePending}
            error={createError}
            onSubmit={createRequirementSection}
          />
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
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{section.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {getRequirementSectionTypeLabel(section.section_type)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {getRequirementDocumentStatusLabel(section.status)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {section.content || "本文はありません。"}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        表示順: {section.sort_order ?? "-"} / 更新:{" "}
                        {formatDateTime(section.updated_at)}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
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
                          選択
                        </Button>
                      ) : null}
                      {canUpdate ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={index === 0 || isSortPending}
                            onClick={() => moveSection(section, "up")}
                          >
                            <ArrowUpIcon data-icon="inline-start" />
                            上へ
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              index === sortedSections.length - 1 ||
                              isSortPending
                            }
                            onClick={() => moveSection(section, "down")}
                          >
                            <ArrowDownIcon data-icon="inline-start" />
                            下へ
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingTarget(section)}
                          >
                            <EditIcon data-icon="inline-start" />
                            編集
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteTarget(section)}
                          >
                            <Trash2Icon data-icon="inline-start" />
                            削除
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {editingTarget?.id === section.id ? (
                    <div className="mt-4 rounded-lg bg-muted p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">
                          セクション編集
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingTarget(null)}
                        >
                          <XIcon data-icon="inline-start" />
                          閉じる
                        </Button>
                      </div>
                      <RequirementSectionForm
                        initialValues={toSectionFormValues(section)}
                        submitLabel="セクション更新"
                        resetOnSuccess={false}
                        isPending={isUpdatePending}
                        error={updateError}
                        onSubmit={(values) =>
                          updateRequirementSection(section.id, section.version, values)
                        }
                        onSuccess={() => setEditingTarget(null)}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            セクションはありません。
          </p>
        )}

        <ResourceDeleteDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          resourceName="セクション"
          description="セクションを削除します。削除すると元に戻せません。"
          isPending={isDeletePending}
          onConfirm={async () => {
            if (!deleteTarget) {
              return;
            }

            await deleteRequirementSection(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      </CardContent>
    </Card>
  );
}

function toSectionFormValues(
  section: RequirementSectionRead
): RequirementSectionFormValues {
  return {
    title: section.title,
    sectionType: section.section_type,
    content: section.content ?? "",
    sortOrder: String(section.sort_order ?? 10),
    status: section.status ?? "draft",
  };
}

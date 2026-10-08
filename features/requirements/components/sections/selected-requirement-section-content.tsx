"use client";

import { type ReactNode, useRef, useState } from "react";
import { EditIcon, Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format/date";
import { cn } from "@/lib/utils";

import { useDeleteRequirementSection } from "../../hooks/use-delete-requirement-section";
import {
  getRequirementDocumentStatusLabel,
  getRequirementSectionTypeLabel,
} from "../../constants/requirement-options";
import { useRequirementSections } from "../../hooks/use-requirement-sections";
import { useUpdateRequirementSection } from "../../hooks/use-update-requirement-section";
import {
  createRequirementReviewAnchor,
  getRequirementReviewAnchorKey,
  getReviewHighlightQuotes,
  isSelectionInsideElement,
  normalizeReviewText,
  type RequirementReviewTargetAnchor,
} from "../../lib/requirement-review-anchor";
import { RequirementSectionEditDialog } from "./section-detail/requirement-section-edit-dialog";

type SelectedRequirementSectionContentProps = {
  projectId: number;
  documentId: number;
  sectionId: number | null;
  canUpdate: boolean;
  targetAnchors?: RequirementReviewTargetAnchor[];
  activeAnchorKey?: string | null;
  onSelectTargetAnchor?: (targetAnchor: RequirementReviewTargetAnchor) => void;
  onActivateSectionComments?: () => void;
  onDeleted?: () => void;
};

export function SelectedRequirementSectionContent({
  projectId,
  documentId,
  sectionId,
  canUpdate,
  targetAnchors = [],
  activeAnchorKey = null,
  onSelectTargetAnchor,
  onActivateSectionComments,
  onDeleted,
}: SelectedRequirementSectionContentProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { sections, isLoading } = useRequirementSections(projectId, documentId);
  const {
    updateRequirementSection,
    isPending: isUpdatePending,
    error: updateError,
  } = useUpdateRequirementSection(projectId, documentId);
  const { deleteRequirementSection, isPending: isDeletePending } =
    useDeleteRequirementSection(projectId, documentId);

  if (!sectionId) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const section = sections.find((item) => item.id === sectionId);

  if (!section) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>選択中セクション</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            選択中のセクションを取得できませんでした。
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleActivateSectionComments = () => {
    onActivateSectionComments?.();
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleActivateSectionComments();
    }
  };

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        className="cursor-pointer transition-colors hover:bg-muted/40"
        onClick={handleActivateSectionComments}
        onKeyDown={handleCardKeyDown}
      >
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>選択中セクション</CardTitle>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {getRequirementSectionTypeLabel(section.section_type)}
                  </span>
                  <span>
                    {getRequirementDocumentStatusLabel(section.status)}
                  </span>
                  <span>更新: {formatDateTime(section.updated_at)}</span>
                </div>
              </div>
              {canUpdate ? (
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditDialogOpen(true);
                    }}
                  >
                    <EditIcon data-icon="inline-start" />
                    編集
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2Icon data-icon="inline-start" />
                    削除
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">{section.title}</h3>
          <ReviewableSectionContent
            documentId={documentId}
            sectionId={section.id}
            sectionVersion={section.version}
            sectionTitle={section.title}
            content={section.content ?? ""}
            targetAnchors={targetAnchors}
            activeAnchorKey={activeAnchorKey}
            onSelectTargetAnchor={onSelectTargetAnchor}
            onActivateSectionComments={onActivateSectionComments}
          >
            <MarkdownPreview
              value={section.content ?? ""}
              emptyMessage="本文はありません。"
              className="min-h-32"
              highlightQuotes={getReviewHighlightQuotes({
                targetAnchors,
                scope: "section_review",
                sectionId: section.id,
                field: "content",
              })}
            />
          </ReviewableSectionContent>
        </CardContent>
      </Card>

      <RequirementSectionEditDialog
        open={editDialogOpen}
        section={section}
        isPending={isUpdatePending}
        error={updateError}
        onOpenChange={setEditDialogOpen}
        onSubmit={updateRequirementSection}
      />

      <ResourceDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        resourceName="セクション"
        description="セクションを削除します。保持期限内はごみ箱から復元できます。"
        isPending={isDeletePending}
        onConfirm={async () => {
          await deleteRequirementSection(section.id);
          setDeleteDialogOpen(false);
          onDeleted?.();
        }}
      />
    </>
  );
}

type ReviewableSectionContentProps = {
  documentId: number;
  sectionId: number;
  sectionVersion: number;
  sectionTitle: string;
  content: string;
  targetAnchors: RequirementReviewTargetAnchor[];
  activeAnchorKey: string | null;
  children: ReactNode;
  onSelectTargetAnchor?: (targetAnchor: RequirementReviewTargetAnchor) => void;
  onActivateSectionComments?: () => void;
};

function ReviewableSectionContent({
  documentId,
  sectionId,
  sectionVersion,
  sectionTitle,
  content,
  activeAnchorKey,
  children,
  onSelectTargetAnchor,
  onActivateSectionComments,
}: ReviewableSectionContentProps) {
  const selectedByMouseRef = useRef(false);
  const baseAnchor: RequirementReviewTargetAnchor = {
    scope: "section_review",
    source_view: "requirement_document_requirements_tab",
    document_id: documentId,
    section_id: sectionId,
    section_version: sectionVersion,
    field: "content",
    quote: "",
    label: sectionTitle,
  };
  const anchorKey = getRequirementReviewAnchorKey(baseAnchor);

  const handleMouseUp = async (event: React.MouseEvent<HTMLElement>) => {
    if (!onSelectTargetAnchor) {
      return;
    }
    const selection = window.getSelection();
    const quote = selection?.toString().trim();

    if (
      !quote ||
      !selection ||
      !isSelectionInsideElement(selection, event.currentTarget)
    ) {
      return;
    }
    selectedByMouseRef.current = true;
    onSelectTargetAnchor(
      await createRequirementReviewAnchor({
        base: baseAnchor,
        quote: normalizeReviewText(quote),
        sourceValue: content,
      }),
    );
    selection.removeAllRanges();
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();

    if (selectedByMouseRef.current) {
      selectedByMouseRef.current = false;
      return;
    }
    onActivateSectionComments?.();
  };

  return (
    <section
      className={cn(
        "scroll-mt-24 rounded-md transition-colors",
        activeAnchorKey === anchorKey
          ? "bg-[var(--status-warning-bg)] ring-2 ring-[var(--status-warning-border)]"
          : "",
      )}
      data-requirement-review-anchor-key={anchorKey}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
    >
      {children}
    </section>
  );
}

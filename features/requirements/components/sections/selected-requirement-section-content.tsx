"use client";

import { useState } from "react";
import { EditIcon, Trash2Icon } from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { RequirementSectionRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

import { useDeleteRequirementSection } from "../../hooks/use-delete-requirement-section";
import { MarkdownPreview } from "../forms/markdown-textarea";
import { RequirementSectionForm } from "../forms/requirement-section-form";
import {
  getRequirementDocumentStatusLabel,
  getRequirementSectionTypeLabel,
} from "../../constants/requirement-options";
import { useRequirementSections } from "../../hooks/use-requirement-sections";
import { useUpdateRequirementSection } from "../../hooks/use-update-requirement-section";
import type { RequirementSectionFormValues } from "../../types/requirement-section-form";

type SelectedRequirementSectionContentProps = {
  projectId: number;
  documentId: number;
  sectionId: number | null;
  canUpdate: boolean;
  onDeleted?: () => void;
};

export function SelectedRequirementSectionContent({
  projectId,
  documentId,
  sectionId,
  canUpdate,
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>選択中セクション</CardTitle>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{getRequirementSectionTypeLabel(section.section_type)}</span>
                  <span>{getRequirementDocumentStatusLabel(section.status)}</span>
                  <span>更新: {formatDateTime(section.updated_at)}</span>
                </div>
              </div>
              {canUpdate ? (
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditDialogOpen(true)}
                  >
                    <EditIcon data-icon="inline-start" />
                    編集
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(true)}
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
          <MarkdownPreview
            value={section.content ?? ""}
            emptyMessage="本文はありません。"
            className="min-h-32"
          />
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[min(92vw,1200px)] overflow-y-auto sm:max-w-none">
          <DialogHeader>
            <DialogTitle>セクション編集</DialogTitle>
            <DialogDescription>
              選択中のセクション情報と本文を編集します。
            </DialogDescription>
          </DialogHeader>
          <div>
            <RequirementSectionForm
              initialValues={toSectionFormValues(section)}
              submitLabel="セクション更新"
              resetOnSuccess={false}
              isPending={isUpdatePending}
              error={updateError}
              onSubmit={(values) =>
                updateRequirementSection(section.id, section.version, values)
              }
              onSuccess={() => setEditDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ResourceDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        resourceName="セクション"
        description="セクションを削除します。削除すると元に戻せません。"
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

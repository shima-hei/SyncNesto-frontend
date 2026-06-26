"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RequirementSectionRead } from "@/lib/api/generated/model";

import { RequirementSectionForm } from "../../forms/requirement-section-form";
import type { RequirementSectionFormValues } from "../../../types/requirement-section-form";

type RequirementSectionEditDialogProps = {
  open: boolean;
  section: RequirementSectionRead;
  isPending: boolean;
  error?: Error | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    sectionId: number,
    version: number,
    values: RequirementSectionFormValues
  ) => Promise<unknown>;
};

export function RequirementSectionEditDialog({
  open,
  section,
  isPending,
  error,
  onOpenChange,
  onSubmit,
}: RequirementSectionEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(92vw,1200px)] overflow-y-auto sm:max-w-none">
        <DialogHeader>
          <DialogTitle>セクション編集</DialogTitle>
          <DialogDescription>
            選択中のセクション情報と本文を編集します。
          </DialogDescription>
        </DialogHeader>
        <RequirementSectionForm
          initialValues={toSectionFormValues(section)}
          submitLabel="セクション更新"
          resetOnSuccess={false}
          isPending={isPending}
          error={error}
          onSubmit={(values) => onSubmit(section.id, section.version, values)}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
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

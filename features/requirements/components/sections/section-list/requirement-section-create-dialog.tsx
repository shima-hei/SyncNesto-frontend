"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { RequirementSectionForm } from "../../forms/requirement-section-form";
import type { RequirementSectionFormValues } from "../../../types/requirement-section-form";

type RequirementSectionCreateDialogProps = {
  open: boolean;
  nextSortOrder: number;
  isPending: boolean;
  error?: Error | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RequirementSectionFormValues) => Promise<unknown>;
};

export function RequirementSectionCreateDialog({
  open,
  nextSortOrder,
  isPending,
  error,
  onOpenChange,
  onSubmit,
}: RequirementSectionCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>セクション追加</DialogTitle>
          <DialogDescription>
            要件を分類するためのセクションを追加します。
          </DialogDescription>
        </DialogHeader>
        <RequirementSectionForm
          nextSortOrder={nextSortOrder}
          isPending={isPending}
          error={error}
          onSubmit={onSubmit}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

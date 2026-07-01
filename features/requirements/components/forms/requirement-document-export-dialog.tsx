"use client";

import { useState } from "react";
import { DownloadIcon, EyeIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  RequirementDocumentExportCreate,
  RequirementDocumentExportRead,
  RequirementSectionRead,
} from "@/lib/api/generated/model";

type RequirementDocumentExportDialogProps = {
  open: boolean;
  isPending: boolean;
  preview?: RequirementDocumentExportRead | null;
  sections: RequirementSectionRead[];
  onOpenChange: (open: boolean) => void;
  onExport: (
    values: RequirementDocumentExportCreate,
    options: { download: boolean }
  ) => Promise<RequirementDocumentExportRead>;
  onPreviewChange: (preview: RequirementDocumentExportRead | null) => void;
};

export function RequirementDocumentExportDialog({
  open,
  isPending,
  preview,
  sections,
  onOpenChange,
  onExport,
  onPreviewChange,
}: RequirementDocumentExportDialogProps) {
  const [values, setValues] = useState<RequirementDocumentExportCreate>({
    format: "markdown",
    include_comments: true,
    include_change_logs: true,
  });

  const handlePreview = async () => {
    const data = await onExport(values, { download: false });

    onPreviewChange(data);
  };

  const handleDownload = async () => {
    await onExport(values, { download: true });
  };

  const selectedSectionIds = values.section_ids ?? null;
  const sortedSections = sections
    .slice()
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0));

  const handleAllSectionsChange = (checked: boolean) => {
    setValues((current) => ({
      ...current,
      section_ids: checked ? undefined : [],
    }));
    onPreviewChange(null);
  };

  const handleSectionChange = (sectionId: number, checked: boolean) => {
    const currentIds =
      selectedSectionIds ?? sortedSections.map((section) => section.id);
    const nextIds = checked
      ? Array.from(new Set([...currentIds, sectionId]))
      : currentIds.filter((id) => id !== sectionId);

    setValues((current) => ({
      ...current,
      section_ids: nextIds.length === sortedSections.length ? undefined : nextIds,
    }));
    onPreviewChange(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>要件定義書を出力</DialogTitle>
          <DialogDescription>
            出力形式と含める情報を選択します。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Field>
            <FieldLabel>出力形式</FieldLabel>
            <Select
              value={values.format ?? "markdown"}
              onValueChange={(format) => {
                setValues((current) => ({ ...current, format }));
                onPreviewChange(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="形式を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="markdown">Markdown</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>出力セクション</FieldLabel>
            <div className="grid gap-2 rounded-md border p-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedSectionIds === null}
                  onCheckedChange={(checked) =>
                    handleAllSectionsChange(checked === true)
                  }
                />
                すべてのセクション
              </label>
              {sortedSections.map((section) => (
                <label
                  key={section.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={
                      selectedSectionIds === null ||
                      selectedSectionIds.includes(section.id)
                    }
                    onCheckedChange={(checked) =>
                      handleSectionChange(section.id, checked === true)
                    }
                  />
                  {section.title}
                </label>
              ))}
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={Boolean(values.include_comments)}
                onCheckedChange={(checked) => {
                  setValues((current) => ({
                    ...current,
                    include_comments: checked === true,
                  }));
                  onPreviewChange(null);
                }}
              />
              コメントを含める
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={Boolean(values.include_change_logs)}
                onCheckedChange={(checked) => {
                  setValues((current) => ({
                    ...current,
                    include_change_logs: checked === true,
                  }));
                  onPreviewChange(null);
                }}
              />
              変更履歴を含める
            </label>
          </div>

          {preview ? (
            <div className="rounded-md border bg-muted p-3">
              <div className="mb-2 text-sm font-medium">プレビュー</div>
              {preview.format === "pdf" ? (
                <p className="text-sm text-muted-foreground">
                  PDFはダウンロードして確認してください。
                </p>
              ) : (
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs">
                  {preview.content}
                </pre>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handlePreview}
          >
            <EyeIcon data-icon="inline-start" />
            プレビュー
          </Button>
          <Button type="button" disabled={isPending} onClick={handleDownload}>
            <DownloadIcon data-icon="inline-start" />
            ダウンロード
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

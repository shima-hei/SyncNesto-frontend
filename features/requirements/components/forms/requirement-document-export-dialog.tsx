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
} from "@/lib/api/generated/model";

type RequirementDocumentExportDialogProps = {
  open: boolean;
  isPending: boolean;
  preview?: RequirementDocumentExportRead | null;
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
                </SelectGroup>
              </SelectContent>
            </Select>
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
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs">
                {preview.content}
              </pre>
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

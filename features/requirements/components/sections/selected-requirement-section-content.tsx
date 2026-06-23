"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format/date";

import { MarkdownPreview } from "../forms/markdown-textarea";
import {
  getRequirementDocumentStatusLabel,
  getRequirementSectionTypeLabel,
} from "../../constants/requirement-options";
import { useRequirementSections } from "../../hooks/use-requirement-sections";

type SelectedRequirementSectionContentProps = {
  projectId: number;
  documentId: number;
  sectionId: number | null;
};

export function SelectedRequirementSectionContent({
  projectId,
  documentId,
  sectionId,
}: SelectedRequirementSectionContentProps) {
  const { sections, isLoading } = useRequirementSections(projectId, documentId);

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
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2">
          <CardTitle>選択中セクション</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{getRequirementSectionTypeLabel(section.section_type)}</span>
            <span>{getRequirementDocumentStatusLabel(section.status)}</span>
            <span>更新: {formatDateTime(section.updated_at)}</span>
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
  );
}

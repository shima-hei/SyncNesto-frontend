"use client";

import { type ReactNode, useState } from "react";

import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RequirementDocumentRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";
import { cn } from "@/lib/utils";

import {
  getRequirementDocumentStatusLabel,
  getRequirementPriorityLabel,
  getRequirementStatusLabel,
  getRequirementTypeLabel,
} from "../../../constants/requirement-options";
import { useRequirementSections } from "../../../hooks/use-requirement-sections";
import { useRequirements } from "../../../hooks/use-requirements";
import { useTargetComments } from "../../../hooks/use-target-comments";
import {
  createRequirementReviewAnchor,
  evaluateRequirementReviewAnchor,
  getRequirementReviewAnchorKey,
  getReviewHighlightQuotes,
  getUnresolvedReviewAnchors,
  isRequirementReviewTargetAnchor,
  isSelectionInsideElement,
  normalizeReviewText,
  type RequirementReviewTargetAnchor,
} from "../../../lib/requirement-review-anchor";
import { RequirementTargetCommentsSection } from "../../sections/requirement-target-comments-section";

type RequirementDocumentOverviewProps = {
  projectId: number;
  documentId: number;
  document: RequirementDocumentRead;
  canComment: boolean;
};

export function RequirementDocumentOverview({
  projectId,
  documentId,
  document,
  canComment,
}: RequirementDocumentOverviewProps) {
  const [selectedTargetAnchor, setSelectedTargetAnchor] =
    useState<RequirementReviewTargetAnchor | null>(null);
  const [activePreviewAnchorKey, setActivePreviewAnchorKey] =
    useState<string | null>(null);
  const { sections, isLoading: isSectionsLoading } = useRequirementSections(
    projectId,
    documentId
  );
  const { requirements, isLoading: isRequirementsLoading } = useRequirements(
    projectId,
    {
      page: 1,
      page_size: 100,
      document_id: documentId,
    }
  );
  const { comments: targetComments } = useTargetComments(
    projectId,
    "document",
    documentId
  );
  const sortedSections = sections
    .slice()
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0));
  const unassignedRequirements = requirements.filter(
    (requirement) => !requirement.section_id
  );
  const targetAnchors = getUnresolvedReviewAnchors(targetComments).filter(
    (targetAnchor) => targetAnchor.scope === "document_preview"
  );

  const handleTargetAnchorClick = (targetAnchor: Record<string, unknown>) => {
    if (!isRequirementReviewTargetAnchor(targetAnchor)) {
      return;
    }
    const anchorKey = getRequirementReviewAnchorKey(targetAnchor);
    const element = window.document.querySelector(
      `[data-document-preview-anchor-key="${anchorKey}"]`
    );

    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    setActivePreviewAnchorKey(anchorKey);
    window.setTimeout(() => {
      setActivePreviewAnchorKey((current) =>
        current === anchorKey ? null : current
      );
    }, 1600);
  };

  const getTargetAnchorStatus = (targetAnchor: Record<string, unknown>) => {
    if (!isRequirementReviewTargetAnchor(targetAnchor)) {
      return null;
    }

    if (
      targetAnchor.preview_target_type === "document" &&
      targetAnchor.field === "purpose"
    ) {
      return evaluateRequirementReviewAnchor(
        targetAnchor,
        document.purpose ?? "",
        document.version
      );
    }

    if (targetAnchor.preview_target_type === "section") {
      const section = sections.find(
        (item) => item.id === targetAnchor.preview_target_id
      );
      const sectionRequirements = requirements.filter(
        (requirement) => requirement.section_id === targetAnchor.preview_target_id
      );

      return evaluateRequirementReviewAnchor(
        targetAnchor,
        getDocumentPreviewSectionSourceText(
          section?.title ?? "",
          section?.content ?? "",
          sectionRequirements
        ),
        section?.version
      );
    }

    if (targetAnchor.preview_target_type === "unassigned_requirements") {
      return evaluateRequirementReviewAnchor(
        targetAnchor,
        getDocumentPreviewSectionSourceText(
          "セクション未設定",
          "",
          unassignedRequirements
        )
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DocumentInfo
            label="ステータス"
            value={
              document.status
                ? getRequirementDocumentStatusLabel(document.status)
                : "-"
            }
          />
          <DocumentInfo
            label="対象システム"
            value={document.target_system_name ?? "-"}
          />
          <DocumentInfo label="クライアント" value={document.client_name ?? "-"} />
          <DocumentInfo label="ベンダー" value={document.vendor_name ?? "-"} />
          <DocumentInfo
            label="更新日時"
            value={formatDateTime(document.updated_at)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] xl:items-start">
        <Card>
          <CardHeader>
            <CardTitle>要件定義書プレビュー</CardTitle>
          </CardHeader>
          <CardContent>
            {isSectionsLoading || isRequirementsLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : (
              <article className="mx-auto flex max-w-4xl flex-col gap-8 rounded-lg border bg-background px-6 py-8 md:px-10">
                <header className="flex flex-col gap-4 border-b pb-6">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                      {document.document_code}
                    </p>
                    <h1 className="text-2xl font-semibold tracking-normal">
                      {document.title}
                    </h1>
                  </div>
                  <dl className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
                    <DocumentMeta
                      label="ステータス"
                      value={
                        document.status
                          ? getRequirementDocumentStatusLabel(document.status)
                          : "-"
                      }
                    />
                    <DocumentMeta
                      label="対象システム"
                      value={document.target_system_name ?? "-"}
                    />
                    <DocumentMeta
                      label="クライアント"
                      value={document.client_name ?? "-"}
                    />
                    <DocumentMeta
                      label="ベンダー"
                      value={document.vendor_name ?? "-"}
                    />
                    <DocumentMeta
                      label="更新日時"
                      value={formatDateTime(document.updated_at)}
                    />
                  </dl>
                </header>

                <ReviewablePreviewBlock
                  anchor={{
                    scope: "document_preview",
                    source_view: "requirement_document_overview_tab",
                    preview_target_type: "document",
                    preview_target_id: documentId,
                    document_id: documentId,
                    field: "purpose",
                    quote: "",
                    label: "目的",
                  }}
                  sourceText={document.purpose ?? ""}
                  activeAnchorKey={activePreviewAnchorKey}
                  onSelectTargetAnchor={setSelectedTargetAnchor}
                  className="flex flex-col gap-3"
                >
                  <h2 className="border-b pb-2 text-xl font-semibold tracking-normal">
                    目的
                  </h2>
                  <p className="whitespace-pre-wrap text-sm leading-7">
                    {renderHighlightedText(
                      document.purpose || "目的は未設定です。",
                      getReviewHighlightQuotes({
                        targetAnchors,
                        scope: "document_preview",
                        previewTargetType: "document",
                        previewTargetId: documentId,
                        documentId,
                        field: "purpose",
                      })
                    )}
                  </p>
                </ReviewablePreviewBlock>

                {sortedSections.map((section) => (
                  <DocumentPreviewSection
                    key={section.id}
                    documentId={documentId}
                    sectionId={section.id}
                    title={section.title}
                    content={section.content ?? ""}
                    sectionVersion={section.version}
                    requirements={requirements.filter(
                      (requirement) => requirement.section_id === section.id
                    )}
                    targetAnchors={targetAnchors}
                    activeAnchorKey={activePreviewAnchorKey}
                    onSelectTargetAnchor={setSelectedTargetAnchor}
                  />
                ))}
                {unassignedRequirements.length ? (
                  <DocumentPreviewSection
                    documentId={documentId}
                    title="セクション未設定"
                    content=""
                    requirements={unassignedRequirements}
                    targetAnchors={targetAnchors}
                    activeAnchorKey={activePreviewAnchorKey}
                    onSelectTargetAnchor={setSelectedTargetAnchor}
                  />
                ) : null}
                {!sortedSections.length && !unassignedRequirements.length ? (
                  <p className="text-sm text-muted-foreground">
                    プレビューするセクションまたは要件はありません。
                  </p>
                ) : null}
              </article>
            )}
          </CardContent>
        </Card>

        <aside className="min-w-0 xl:sticky xl:top-20">
          <RequirementTargetCommentsSection
            projectId={projectId}
            targetType="document"
            targetId={documentId}
            title="要件定義書コメント"
            canComment={canComment}
            selectedTargetAnchor={selectedTargetAnchor}
            onTargetAnchorClick={handleTargetAnchorClick}
            getTargetAnchorStatus={getTargetAnchorStatus}
            showTargetAnchorInput={false}
            className="xl:max-h-[calc(100vh-6rem)] xl:overflow-hidden"
            contentClassName="xl:min-h-0 xl:overflow-y-auto"
          />
        </aside>
      </div>
    </div>
  );
}

type DocumentPreviewSectionProps = {
  documentId: number;
  sectionId?: number;
  title: string;
  content: string;
  sectionVersion?: number;
  requirements: {
    id: number;
    requirement_code: string;
    title: string;
    requirement_type?: string | null;
    priority?: string | null;
    status?: string | null;
  }[];
  targetAnchors: RequirementReviewTargetAnchor[];
  activeAnchorKey: string | null;
  onSelectTargetAnchor: (targetAnchor: RequirementReviewTargetAnchor) => void;
};

function DocumentPreviewSection({
  documentId,
  sectionId,
  title,
  content,
  sectionVersion,
  requirements,
  targetAnchors,
  activeAnchorKey,
  onSelectTargetAnchor,
}: DocumentPreviewSectionProps) {
  const previewTargetType = sectionId ? "section" : "unassigned_requirements";
  const previewTargetId = sectionId ?? null;
  const sourceText = getDocumentPreviewSectionSourceText(
    title,
    content,
    requirements
  );
  const highlightQuotes = getReviewHighlightQuotes({
    targetAnchors,
    scope: "document_preview",
    previewTargetType,
    previewTargetId,
    sectionId: previewTargetId,
    field: "section",
  });

  return (
    <ReviewablePreviewBlock
      anchor={{
        scope: "document_preview",
        source_view: "requirement_document_overview_tab",
        preview_target_type: previewTargetType,
        preview_target_id: previewTargetId,
        document_id: documentId,
        section_id: previewTargetId,
        section_version: sectionVersion,
        field: "section",
        quote: "",
        label: title,
      }}
      sourceText={sourceText}
      activeAnchorKey={activeAnchorKey}
      onSelectTargetAnchor={onSelectTargetAnchor}
      className="flex flex-col gap-4"
    >
      <h2 className="border-b pb-2 text-xl font-semibold tracking-normal">
        {title}
      </h2>
      {content.trim() ? (
        <MarkdownPreview
          value={content}
          emptyMessage="本文はありません。"
          className="min-h-0 border-0 bg-transparent p-0"
          highlightQuotes={highlightQuotes}
        />
      ) : null}
      {requirements.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">要件一覧</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>要件ID</TableHead>
                <TableHead>タイトル</TableHead>
                <TableHead>種別</TableHead>
                <TableHead>優先度</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requirements.map((requirement) => (
                <TableRow key={requirement.id}>
                  <TableCell className="font-medium">
                    {renderHighlightedText(
                      requirement.requirement_code,
                      highlightQuotes
                    )}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {renderHighlightedText(requirement.title, highlightQuotes)}
                  </TableCell>
                  <TableCell>
                    {renderHighlightedText(
                      getRequirementTypeLabel(requirement.requirement_type),
                      highlightQuotes
                    )}
                  </TableCell>
                  <TableCell>
                    {renderHighlightedText(
                      getRequirementPriorityLabel(requirement.priority),
                      highlightQuotes
                    )}
                  </TableCell>
                  <TableCell>
                    {renderHighlightedText(
                      getRequirementStatusLabel(requirement.status),
                      highlightQuotes
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : content.trim() ? null : (
        <p className="text-sm text-muted-foreground">
          本文と要件はありません。
        </p>
      )}
    </ReviewablePreviewBlock>
  );
}

type ReviewablePreviewBlockProps = {
  anchor: RequirementReviewTargetAnchor;
  sourceText: string;
  activeAnchorKey: string | null;
  className?: string;
  children: ReactNode;
  onSelectTargetAnchor: (targetAnchor: RequirementReviewTargetAnchor) => void;
};

function ReviewablePreviewBlock({
  anchor,
  sourceText,
  activeAnchorKey,
  className,
  children,
  onSelectTargetAnchor,
}: ReviewablePreviewBlockProps) {
  const anchorKey = getRequirementReviewAnchorKey(anchor);

  const handleMouseUp = async (event: React.MouseEvent<HTMLElement>) => {
    const selection = window.getSelection();
    const currentTarget = event.currentTarget;
    const rawQuote = selection?.toString();
    const quote = rawQuote?.trim();

    if (
      !quote ||
      !selection ||
      !isSelectionInsideElement(selection, currentTarget)
    ) {
      return;
    }
    const selectableText = normalizeReviewText(currentTarget.textContent ?? sourceText);
    const normalizedQuote = normalizeReviewText(quote);

    onSelectTargetAnchor(
      await createRequirementReviewAnchor({
        base: anchor,
        quote: normalizedQuote,
        sourceValue: sourceText || selectableText,
      })
    );
    selection.removeAllRanges();
  };

  return (
    <section
      className={cn(
        "scroll-mt-24 rounded-md transition-colors",
        activeAnchorKey === anchorKey ? "bg-yellow-100/70 ring-2 ring-yellow-300" : "",
        className
      )}
      data-document-preview-anchor-key={anchorKey}
      onMouseUp={handleMouseUp}
    >
      {children}
    </section>
  );
}

function DocumentMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
}

function DocumentInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

const renderHighlightedText = (value: string, highlightQuotes: string[]) => {
  const quote = highlightQuotes.find((item) => value.includes(item));

  if (!quote) {
    return value;
  }
  const [before, after] = value.split(quote, 2);

  return (
    <>
      {before}
      <mark className="rounded-sm bg-yellow-200 px-0.5 text-foreground">
        {quote}
      </mark>
      {after}
    </>
  );
};

const getDocumentPreviewSectionSourceText = (
  title: string,
  content: string,
  requirements: {
    requirement_code: string;
    title: string;
    requirement_type?: string | null;
    priority?: string | null;
    status?: string | null;
  }[]
) => {
  return [
    title,
    content,
    ...requirements.map((requirement) =>
      [
        requirement.requirement_code,
        requirement.title,
        getRequirementTypeLabel(requirement.requirement_type),
        getRequirementPriorityLabel(requirement.priority),
        getRequirementStatusLabel(requirement.status),
      ].join(" ")
    ),
  ].join("\n");
};

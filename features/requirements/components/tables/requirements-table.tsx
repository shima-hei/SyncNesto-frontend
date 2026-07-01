"use client";

import { type ReactNode } from "react";

import { ClickableTableRow } from "@/components/shared/tables/clickable-table-row";
import { TableEmptyRow } from "@/components/shared/tables/table-empty-row";
import { TableListSkeleton } from "@/components/shared/tables/table-list-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/format/date";
import type { RequirementRead } from "@/lib/api/generated/model";
import { cn } from "@/lib/utils";

import {
  REQUIREMENT_PRIORITY_OPTIONS,
  REQUIREMENT_STATUS_OPTIONS,
  getRequirementTypeLabel,
  getRequirementPriorityLabel,
  getRequirementStatusLabel,
} from "../../constants/requirement-options";
import { useUpdateRequirementListItem } from "../../hooks/use-update-requirement-list-item";
import {
  RequirementPriorityBadge,
  RequirementStatusBadge,
  RequirementTypeBadge,
} from "../shared/requirement-badges";
import {
  createRequirementReviewAnchor,
  getRequirementReviewAnchorKey,
  getReviewHighlightQuotes,
  isSelectionInsideElement,
  normalizeReviewText,
  type RequirementReviewTargetAnchor,
} from "../../lib/requirement-review-anchor";

type RequirementsTableProps = {
  projectId: number;
  documentId: number;
  requirements: RequirementRead[];
  isLoading: boolean;
  canUpdate: boolean;
  selectedRequirementId?: number | null;
  targetAnchors?: RequirementReviewTargetAnchor[];
  activeAnchorKey?: string | null;
  onSelectRequirement?: (requirement: RequirementRead) => void;
  onSelectReviewAnchor?: (
    requirement: RequirementRead,
    targetAnchor: RequirementReviewTargetAnchor
  ) => void;
};

export function RequirementsTable({
  projectId,
  documentId,
  requirements,
  isLoading,
  canUpdate,
  selectedRequirementId,
  targetAnchors = [],
  activeAnchorKey = null,
  onSelectRequirement,
  onSelectReviewAnchor,
}: RequirementsTableProps) {
  const { updateRequirementListItem, isPending } =
    useUpdateRequirementListItem(projectId);

  if (isLoading) {
    return <TableListSkeleton widths={["w-48", "w-24", "w-20", "w-28"]} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>要件</TableHead>
          <TableHead>種別</TableHead>
          <TableHead>優先度</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead>担当者</TableHead>
          <TableHead>更新日時</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requirements.length ? (
          requirements.map((requirement) => {
            const cells = (
              <>
                <TableCell>
                  <div className="flex min-w-64 flex-col">
                    <ReviewableRequirementText
                      documentId={documentId}
                      requirement={requirement}
                      field="title"
                      label={`${requirement.requirement_code} タイトル`}
                      value={requirement.title}
                      className="truncate font-medium"
                      targetAnchors={targetAnchors}
                      activeAnchorKey={activeAnchorKey}
                      onSelectRequirement={onSelectRequirement}
                      onSelectReviewAnchor={onSelectReviewAnchor}
                    />
                    <ReviewableRequirementText
                      documentId={documentId}
                      requirement={requirement}
                      field="requirement_code"
                      label={`${requirement.requirement_code} 要件コード`}
                      value={requirement.requirement_code}
                      className="truncate text-xs text-muted-foreground"
                      targetAnchors={targetAnchors}
                      activeAnchorKey={activeAnchorKey}
                      onSelectRequirement={onSelectRequirement}
                      onSelectReviewAnchor={onSelectReviewAnchor}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <ReviewableRequirementText
                    documentId={documentId}
                    requirement={requirement}
                    field="requirement_type"
                    label={`${requirement.requirement_code} 種別`}
                    value={getRequirementTypeLabel(requirement.requirement_type)}
                    targetAnchors={targetAnchors}
                    activeAnchorKey={activeAnchorKey}
                    onSelectRequirement={onSelectRequirement}
                    onSelectReviewAnchor={onSelectReviewAnchor}
                  >
                    <RequirementTypeBadge type={requirement.requirement_type} />
                  </ReviewableRequirementText>
                </TableCell>
                <TableCell>
                  {canUpdate ? (
                    <div className="flex flex-col gap-1">
                      <RequirementInlineSelect
                        value={requirement.priority ?? "must"}
                        label={getRequirementPriorityLabel(requirement.priority)}
                        disabled={isPending}
                        options={REQUIREMENT_PRIORITY_OPTIONS}
                        onValueChange={(priority) =>
                          updateRequirementListItem(requirement, { priority })
                        }
                      />
                      <ReviewableRequirementText
                        documentId={documentId}
                        requirement={requirement}
                        field="priority"
                        label={`${requirement.requirement_code} 優先度`}
                        value={getRequirementPriorityLabel(requirement.priority)}
                        className="text-xs text-muted-foreground"
                        targetAnchors={targetAnchors}
                        activeAnchorKey={activeAnchorKey}
                        onSelectRequirement={onSelectRequirement}
                        onSelectReviewAnchor={onSelectReviewAnchor}
                      />
                    </div>
                  ) : (
                    <ReviewableRequirementText
                      documentId={documentId}
                      requirement={requirement}
                      field="priority"
                      label={`${requirement.requirement_code} 優先度`}
                      value={getRequirementPriorityLabel(requirement.priority)}
                      targetAnchors={targetAnchors}
                      activeAnchorKey={activeAnchorKey}
                      onSelectRequirement={onSelectRequirement}
                      onSelectReviewAnchor={onSelectReviewAnchor}
                    >
                      <RequirementPriorityBadge priority={requirement.priority} />
                    </ReviewableRequirementText>
                  )}
                </TableCell>
                <TableCell>
                  {canUpdate ? (
                    <div className="flex flex-col gap-1">
                      <RequirementInlineSelect
                        value={requirement.status ?? "draft"}
                        label={getRequirementStatusLabel(requirement.status)}
                        disabled={isPending}
                        options={REQUIREMENT_STATUS_OPTIONS}
                        onValueChange={(status) =>
                          updateRequirementListItem(requirement, { status })
                        }
                      />
                      <ReviewableRequirementText
                        documentId={documentId}
                        requirement={requirement}
                        field="status"
                        label={`${requirement.requirement_code} ステータス`}
                        value={getRequirementStatusLabel(requirement.status)}
                        className="text-xs text-muted-foreground"
                        targetAnchors={targetAnchors}
                        activeAnchorKey={activeAnchorKey}
                        onSelectRequirement={onSelectRequirement}
                        onSelectReviewAnchor={onSelectReviewAnchor}
                      />
                    </div>
                  ) : (
                    <ReviewableRequirementText
                      documentId={documentId}
                      requirement={requirement}
                      field="status"
                      label={`${requirement.requirement_code} ステータス`}
                      value={getRequirementStatusLabel(requirement.status)}
                      targetAnchors={targetAnchors}
                      activeAnchorKey={activeAnchorKey}
                      onSelectRequirement={onSelectRequirement}
                      onSelectReviewAnchor={onSelectReviewAnchor}
                    >
                      <RequirementStatusBadge status={requirement.status} />
                    </ReviewableRequirementText>
                  )}
                </TableCell>
                <TableCell>{requirement.owner_id ?? "-"}</TableCell>
                <TableCell>{formatDateTime(requirement.updated_at)}</TableCell>
              </>
            );

            if (onSelectRequirement) {
              const isSelected = selectedRequirementId === requirement.id;

              return (
                <TableRow
                  key={requirement.id}
                  tabIndex={0}
                  data-state={isSelected ? "selected" : undefined}
                  className="cursor-pointer data-[state=selected]:bg-muted"
                  onClick={() => onSelectRequirement(requirement)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectRequirement(requirement);
                    }
                  }}
                >
                  {cells}
                </TableRow>
              );
            }

            return (
              <ClickableTableRow
                key={requirement.id}
                href={`/projects/joined/${projectId}/requirements/${documentId}/items/${requirement.id}`}
              >
                {cells}
              </ClickableTableRow>
            );
          })
        ) : (
          <TableEmptyRow colSpan={6} message="条件に一致する要件がありません。" />
        )}
      </TableBody>
    </Table>
  );
}

type ReviewableRequirementTextProps = {
  documentId: number;
  requirement: RequirementRead;
  field: string;
  label: string;
  value: string;
  className?: string;
  children?: ReactNode;
  targetAnchors: RequirementReviewTargetAnchor[];
  activeAnchorKey: string | null;
  onSelectRequirement?: (requirement: RequirementRead) => void;
  onSelectReviewAnchor?: (
    requirement: RequirementRead,
    targetAnchor: RequirementReviewTargetAnchor
  ) => void;
};

function ReviewableRequirementText({
  documentId,
  requirement,
  field,
  label,
  value,
  className,
  children,
  targetAnchors,
  activeAnchorKey,
  onSelectRequirement,
  onSelectReviewAnchor,
}: ReviewableRequirementTextProps) {
  const baseAnchor: RequirementReviewTargetAnchor = {
    scope: "section_requirements_review",
    source_view: "requirement_document_requirements_tab",
    document_id: documentId,
    section_id: requirement.section_id ?? null,
    requirement_id: requirement.id,
    requirement_version: requirement.version,
    field,
    quote: "",
    label,
  };
  const anchorKey = getRequirementReviewAnchorKey(baseAnchor);
  const highlightQuotes = getReviewHighlightQuotes({
    targetAnchors,
    scope: "section_requirements_review",
    requirementId: requirement.id,
    field,
  });
  const hasHighlight = highlightQuotes.some((quote) => value.includes(quote));

  const handleMouseUp = async (event: React.MouseEvent<HTMLSpanElement>) => {
    if (!onSelectReviewAnchor) {
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
    const targetAnchor = await createRequirementReviewAnchor({
      base: baseAnchor,
      quote: normalizeReviewText(quote),
      sourceValue: value,
    });

    onSelectRequirement?.(requirement);
    onSelectReviewAnchor(requirement, targetAnchor);
    selection.removeAllRanges();
  };

  return (
    <span
      className={className}
      data-requirement-review-anchor-key={anchorKey}
      onMouseUp={handleMouseUp}
    >
      <span
        className={cn(
          activeAnchorKey === anchorKey
            ? "rounded-sm bg-yellow-100 ring-2 ring-yellow-300"
            : "",
          hasHighlight && children ? "rounded-sm bg-yellow-200 px-0.5" : ""
        )}
      >
        {children ?? renderHighlightedText(value, highlightQuotes)}
      </span>
    </span>
  );
}

function RequirementInlineSelect({
  value,
  label,
  disabled,
  options,
  onValueChange,
}: {
  value: string;
  label: string;
  disabled: boolean;
  options: readonly { value: string; label: string }[];
  onValueChange: (value: string) => void;
}) {
  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Select value={value} disabled={disabled} onValueChange={onValueChange}>
        <SelectTrigger className="h-8 w-32">
          <SelectValue>{label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
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

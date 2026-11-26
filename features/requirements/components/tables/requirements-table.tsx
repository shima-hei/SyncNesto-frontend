"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { useListNavigation } from "@/hooks/use-list-navigation";
import {
  EditIcon,
  EllipsisIcon,
  MessageSquareIcon,
  MessageSquarePlusIcon,
} from "lucide-react";

import { ClickableTableRow } from "@/components/shared/tables/clickable-table-row";
import { TableEmptyRow } from "@/components/shared/tables/table-empty-row";
import { TableListSkeleton } from "@/components/shared/tables/table-list-skeleton";
import { UserDisplay } from "@/components/shared/display/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/format/date";
import type { RequirementRead } from "@/lib/api/generated/model";
import { cn } from "@/lib/utils";

import {
  REQUIREMENT_PRIORITY_OPTIONS,
  getRequirementTypeLabel,
  getRequirementPriorityLabel,
} from "../../constants/requirement-options";
import { useUpdateRequirementListItem } from "../../hooks/use-update-requirement-list-item";
import { useRequirementItemWorkflow } from "../../hooks/use-requirement-item-workflow";
import { RequirementItemReviewBadge } from "../review/requirement-item-workflow";
import {
  RequirementPriorityBadge,
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
  coverageByRequirement?: Record<number, number>;
  coverageState?: "loading" | "error" | "ready";
  isLoading: boolean;
  canUpdate: boolean;
  showType?: boolean;
  showUpdatedAt?: boolean;
  selectedRequirementId?: number | null;
  targetAnchors?: RequirementReviewTargetAnchor[];
  activeAnchorKey?: string | null;
  onSelectRequirement?: (requirement: RequirementRead) => void;
  onNavigateRequirement?: () => void;
  onSelectReviewAnchor?: (
    requirement: RequirementRead,
    targetAnchor: RequirementReviewTargetAnchor,
  ) => void;
};

export function RequirementsTable({
  projectId,
  documentId,
  requirements,
  coverageByRequirement = {},
  coverageState = "ready",
  isLoading,
  canUpdate,
  showType = false,
  showUpdatedAt = false,
  selectedRequirementId,
  targetAnchors = [],
  activeAnchorKey = null,
  onSelectRequirement,
  onNavigateRequirement,
  onSelectReviewAnchor,
}: RequirementsTableProps) {
  const { withReturn } = useListNavigation(
    `/projects/joined/${projectId}/requirements/${documentId}?tab=requirements`,
  );
  const { updateRequirementListItem, isPending } =
    useUpdateRequirementListItem(projectId);
  const workflow = useRequirementItemWorkflow(projectId, requirements);
  const states = new Map(
    workflow.data?.map((item) => [item.requirement_id, item]),
  );

  if (isLoading) {
    return <TableListSkeleton widths={["w-20", "w-48", "w-20", "w-24"]} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-px">ID</TableHead>
          <TableHead>要件名</TableHead>
          {showType ? <TableHead>種別</TableHead> : null}
          <TableHead>優先度</TableHead>
          <TableHead scope="col">確認状況</TableHead>
          <TableHead>担当者</TableHead>
          <TableHead>関連テスト</TableHead>
          {showUpdatedAt ? <TableHead>更新日時</TableHead> : null}
          <TableHead className="w-px">
            <span className="sr-only">操作</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requirements.length ? (
          requirements.map((requirement) => {
            const state = states.get(requirement.id);
            const href = withReturn(
              `/projects/joined/${projectId}/requirements/${documentId}/items/${requirement.id}`,
            );
            const cells = (
              <>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
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
                </TableCell>
                <TableCell className="min-w-48 max-w-sm whitespace-normal">
                  <ReviewableRequirementText
                    documentId={documentId}
                    requirement={requirement}
                    field="title"
                    label={`${requirement.requirement_code} タイトル`}
                    value={requirement.title}
                    targetAnchors={targetAnchors}
                    activeAnchorKey={activeAnchorKey}
                    onSelectRequirement={onSelectRequirement}
                    onSelectReviewAnchor={onSelectReviewAnchor}
                  >
                    <Link
                      href={href}
                      className="block rounded-sm font-medium [overflow-wrap:anywhere] hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      onClick={(event) => {
                        if (window.getSelection()?.toString().trim()) {
                          event.preventDefault();
                          return;
                        }
                        onNavigateRequirement?.();
                      }}
                    >
                      {requirement.title}
                    </Link>
                  </ReviewableRequirementText>
                </TableCell>
                {showType ? (
                  <TableCell>
                    <ReviewableRequirementText
                      documentId={documentId}
                      requirement={requirement}
                      field="requirement_type"
                      label={`${requirement.requirement_code} 種別`}
                      value={getRequirementTypeLabel(
                        requirement.requirement_type,
                      )}
                      targetAnchors={targetAnchors}
                      activeAnchorKey={activeAnchorKey}
                      onSelectRequirement={onSelectRequirement}
                      onSelectReviewAnchor={onSelectReviewAnchor}
                    >
                      <RequirementTypeBadge
                        type={requirement.requirement_type}
                      />
                    </ReviewableRequirementText>
                  </TableCell>
                ) : null}
                <TableCell>
                  {canUpdate ? (
                    <ReviewableRequirementText
                      documentId={documentId}
                      requirement={requirement}
                      field="priority"
                      label={`${requirement.requirement_code} 優先度`}
                      value={getRequirementPriorityLabel(requirement.priority)}
                      showTargetAction
                      targetAnchors={targetAnchors}
                      activeAnchorKey={activeAnchorKey}
                      onSelectRequirement={onSelectRequirement}
                      onSelectReviewAnchor={onSelectReviewAnchor}
                    >
                      <RequirementInlineSelect
                        value={requirement.priority ?? ""}
                        ariaLabel={`${requirement.requirement_code} 優先度`}
                        disabled={isPending}
                        options={REQUIREMENT_PRIORITY_OPTIONS}
                        onValueChange={(priority) =>
                          updateRequirementListItem(requirement, { priority })
                        }
                      />
                    </ReviewableRequirementText>
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
                      <RequirementPriorityBadge
                        priority={requirement.priority}
                      />
                    </ReviewableRequirementText>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {state ? (
                    <RequirementItemReviewBadge
                      review={state.review}
                      pending={Boolean(state.review_request_id)}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {workflow.isError
                        ? "取得できません"
                        : workflow.isFetching
                          ? "確認中…"
                          : "―"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <UserDisplay
                    name={requirement.owner?.name}
                    src={requirement.owner?.avatar_url}
                    emptyLabel={
                      requirement.owner_id ? "担当者情報なし" : "未割り当て"
                    }
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {coverageState === "loading"
                    ? "確認中…"
                    : coverageState === "error"
                      ? "取得できません"
                      : `${coverageByRequirement[requirement.id] ?? 0}件`}
                </TableCell>
                {showUpdatedAt ? (
                  <TableCell>
                    {formatDateTime(requirement.updated_at)}
                  </TableCell>
                ) : null}
                <TableCell>
                  {canUpdate || onSelectRequirement ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${requirement.requirement_code} の操作`}
                        >
                          <EllipsisIcon aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onSelectRequirement ? (
                          <DropdownMenuItem
                            onSelect={() => onSelectRequirement(requirement)}
                          >
                            <MessageSquareIcon aria-hidden /> 関連情報を表示
                          </DropdownMenuItem>
                        ) : null}
                        {canUpdate ? (
                          <DropdownMenuItem asChild>
                            <Link
                              href={withReturn(
                                `/projects/joined/${projectId}/requirements/${documentId}/items/${requirement.id}/edit`,
                              )}
                              onClick={onNavigateRequirement}
                            >
                              <EditIcon aria-hidden /> 編集
                            </Link>
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </TableCell>
              </>
            );

            return (
              <ClickableTableRow
                key={requirement.id}
                data-workbench-requirement-id={requirement.id}
                data-state={
                  selectedRequirementId === requirement.id
                    ? "selected"
                    : undefined
                }
                href={href}
                onClick={(event) => {
                  if (
                    event.target instanceof Element &&
                    event.target.closest(
                      "a,button,input,textarea,[role=menuitem]",
                    )
                  )
                    return;
                  if (window.getSelection()?.toString().trim()) {
                    event.preventDefault();
                    return;
                  }
                  onNavigateRequirement?.();
                }}
                onKeyDown={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    (event.key === "Enter" || event.key === " ")
                  )
                    onNavigateRequirement?.();
                }}
              >
                {cells}
              </ClickableTableRow>
            );
          })
        ) : (
          <TableEmptyRow
            colSpan={7 + Number(showType) + Number(showUpdatedAt)}
            message="条件に一致する要件がありません。"
          />
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
  showTargetAction?: boolean;
  targetAnchors: RequirementReviewTargetAnchor[];
  activeAnchorKey: string | null;
  onSelectRequirement?: (requirement: RequirementRead) => void;
  onSelectReviewAnchor?: (
    requirement: RequirementRead,
    targetAnchor: RequirementReviewTargetAnchor,
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
  showTargetAction = false,
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

  const handleMouseUp = async (event: React.MouseEvent<HTMLDivElement>) => {
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
    <div
      className={cn(
        className,
        showTargetAction && "group/requirement-field flex items-center gap-1",
      )}
      data-requirement-review-anchor-key={anchorKey}
      onMouseUp={handleMouseUp}
    >
      <div
        className={cn(
          "min-w-0",
          activeAnchorKey === anchorKey
            ? "rounded-sm bg-[var(--status-warning-bg)] ring-2 ring-[var(--status-warning-border)]"
            : "",
          hasHighlight && children
            ? "rounded-sm bg-[var(--status-warning-bg)] px-0.5"
            : "",
        )}
      >
        {children ?? renderHighlightedText(value, highlightQuotes)}
      </div>
      {showTargetAction && onSelectReviewAnchor ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`${label}にコメント・レビュー`}
          title={`${label}にコメント・レビュー`}
          className="pointer-fine:opacity-0 pointer-fine:group-hover/requirement-field:opacity-100 pointer-fine:group-focus-within/requirement-field:opacity-100"
          onMouseUp={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onClick={async (event) => {
            event.stopPropagation();
            const targetAnchor = await createRequirementReviewAnchor({
              base: baseAnchor,
              quote: value,
              sourceValue: value,
            });
            onSelectRequirement?.(requirement);
            onSelectReviewAnchor(requirement, targetAnchor);
          }}
        >
          <MessageSquarePlusIcon aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}

function RequirementInlineSelect({
  value,
  ariaLabel,
  disabled,
  options,
  onValueChange,
}: {
  value: string;
  ariaLabel: string;
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
        <SelectTrigger
          size="sm"
          className="h-auto gap-1 border-0 bg-transparent p-0 shadow-none dark:bg-transparent"
          aria-label={ariaLabel}
        >
          <RequirementPriorityBadge priority={value} />
        </SelectTrigger>
        <SelectContent position="popper" align="start" collisionPadding={8}>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <RequirementPriorityBadge priority={option.value} />
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
      <mark className="rounded-sm bg-[var(--status-warning-bg)] px-0.5 text-foreground">
        {quote}
      </mark>
      {after}
    </>
  );
};

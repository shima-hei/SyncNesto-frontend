"use client";

import { cn } from "@/lib/utils";
import type { RequirementDetailRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

import {
  createRequirementDetailCommentAnchor,
  getRequirementCommentAnchorKey,
  type RequirementCommentAnchor,
} from "../../lib/requirement-comment-anchor";
import { getRequirementDetailTitle } from "../../lib/requirement-detail-metadata";
import {
  CommentTargetButton,
  RequirementDetailActionButtons,
  RequirementDetailSummary,
} from "./requirement-detail-list-row";

type RequirementDetailItemCardProps = {
  detail: RequirementDetailRead;
  canUpdate: boolean;
  variant?: "unit" | "screen" | "item";
  extraActions?: React.ReactNode;
  children?: React.ReactNode;
  onSelectCommentAnchor?: (targetAnchor: RequirementCommentAnchor) => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function RequirementDetailItemCard({
  detail,
  canUpdate,
  variant = "item",
  extraActions,
  children,
  onSelectCommentAnchor,
  onEdit,
  onDelete,
}: RequirementDetailItemCardProps) {
  return (
    <div
      className={cn(
        "@container/detail-card min-w-0 scroll-mt-24 rounded-md border bg-background p-2.5",
        variant === "unit" &&
          "w-full border-l-4 border-l-primary/50 bg-muted/10 p-3",
        variant === "screen" &&
          "w-full border-l-2 border-l-primary/40 bg-muted/20",
        variant === "item" && "min-w-[220px] max-w-full",
      )}
      data-requirement-comment-anchor={getRequirementCommentAnchorKey(
        createRequirementDetailCommentAnchor(detail),
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 @min-[40rem]/detail-card:flex-row @min-[40rem]/detail-card:items-start @min-[40rem]/detail-card:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="break-words text-sm font-medium">
              {getRequirementDetailTitle(detail)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(detail.updated_at)}
            </span>
          </div>
          {canUpdate || extraActions || onSelectCommentAnchor ? (
            <div className="flex shrink-0 flex-wrap gap-1 @min-[40rem]/detail-card:justify-end">
              {onSelectCommentAnchor ? (
                <CommentTargetButton
                  detail={detail}
                  onSelectCommentAnchor={onSelectCommentAnchor}
                />
              ) : null}
              {extraActions}
              {canUpdate ? (
                <RequirementDetailActionButtons
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ) : null}
            </div>
          ) : null}
        </div>
        <RequirementDetailSummary
          detail={detail}
          className="@min-[28rem]/detail-card:grid-cols-2"
        />
        {children ? <div className="min-w-0">{children}</div> : null}
      </div>
    </div>
  );
}

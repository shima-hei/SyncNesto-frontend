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
        "scroll-mt-24 rounded-md border bg-background p-2.5 shadow-sm",
        variant === "unit" &&
          "w-full border-l-4 border-l-primary/50 bg-muted/10 p-3",
        variant === "screen" &&
          "w-full border-l-4 border-l-sky-400 bg-sky-50/40",
        variant === "item" && "min-w-[220px] max-w-full",
      )}
      data-requirement-comment-anchor={getRequirementCommentAnchorKey(
        createRequirementDetailCommentAnchor(detail),
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="break-words text-sm font-medium">
              {getRequirementDetailTitle(detail)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(detail.updated_at)}
            </span>
          </div>
          {canUpdate || extraActions || onSelectCommentAnchor ? (
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
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
        <RequirementDetailSummary detail={detail} className="sm:grid-cols-3" />
        {children ? <div className="min-w-0">{children}</div> : null}
      </div>
    </div>
  );
}

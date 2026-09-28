"use client";

import { EditIcon, MessageSquarePlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RequirementDetailRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

import {
  createRequirementDetailCommentAnchor,
  getRequirementCommentAnchorKey,
  type RequirementCommentAnchor,
} from "../../lib/requirement-comment-anchor";
import {
  DISPLAY_DETAIL_TYPE,
  getRequirementDetailEntries,
  getRequirementDetailTitle,
  getRequirementDetailTypeLabel,
  INPUT_DETAIL_TYPE,
} from "../../lib/requirement-detail-metadata";

type RequirementDetailRowTone = "default" | "input" | "display" | "related";

type RequirementDetailListRowProps = {
  detail: RequirementDetailRead;
  canUpdate: boolean;
  tone?: RequirementDetailRowTone;
  onSelectCommentAnchor?: (targetAnchor: RequirementCommentAnchor) => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function RequirementDetailListRow({
  detail,
  canUpdate,
  tone = "default",
  onSelectCommentAnchor,
  onEdit,
  onDelete,
}: RequirementDetailListRowProps) {
  const resolvedTone = tone === "default" ? getDetailRowTone(detail) : tone;

  return (
    <div
      className={cn(
        "@container/detail-row grid min-w-0 scroll-mt-24 gap-2 border-t px-2 py-2 first:border-t-0 @min-[40rem]/detail-group:grid-cols-[minmax(0,1fr)_auto] @min-[40rem]/detail-group:items-center",
        ROW_TONE_CLASSES[resolvedTone],
      )}
      data-requirement-comment-anchor={getRequirementCommentAnchorKey(
        createRequirementDetailCommentAnchor(detail),
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="secondary" className="shrink-0">
            {getRequirementDetailTypeLabel(detail.detail_type)}
          </Badge>
          <p className="min-w-0 truncate text-sm font-medium">
            {getRequirementDetailDisplayTitle(detail)}
          </p>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDateTime(detail.updated_at)}
        </p>
      </div>
      <RequirementDetailSummary
        detail={detail}
        className="@min-[28rem]/detail-row:grid-cols-2 @min-[40rem]/detail-group:col-span-2 @min-[40rem]/detail-group:row-start-2"
      />
      {canUpdate || onSelectCommentAnchor ? (
        <div className="flex shrink-0 flex-wrap gap-1 @min-[40rem]/detail-group:col-start-2 @min-[40rem]/detail-group:row-start-1 @min-[40rem]/detail-group:justify-end">
          {onSelectCommentAnchor ? (
            <CommentTargetButton
              detail={detail}
              onSelectCommentAnchor={onSelectCommentAnchor}
            />
          ) : null}
          {canUpdate ? (
            <RequirementDetailActionButtons
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type RequirementDetailSummaryProps = {
  detail: RequirementDetailRead;
  className?: string;
};

export function RequirementDetailSummary({
  detail,
  className,
}: RequirementDetailSummaryProps) {
  const entries = getRequirementDetailEntries(detail.detail_json ?? {});

  if (!entries.length) {
    return null;
  }

  return (
    <dl className={cn("grid min-w-0 gap-x-4 gap-y-1 text-xs", className)}>
      {entries.map((entry) => (
        <div key={entry.key} className="flex min-w-0 items-baseline gap-1.5">
          <dt className="shrink-0 text-muted-foreground">{entry.label}:</dt>
          <dd className="min-w-0 truncate text-foreground" title={entry.value}>
            {entry.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function RequirementDetailActionButtons({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2"
        onClick={onEdit}
      >
        <EditIcon data-icon="inline-start" />
        編集
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2"
        onClick={onDelete}
      >
        <Trash2Icon data-icon="inline-start" />
        削除
      </Button>
    </>
  );
}

export function CommentTargetButton({
  detail,
  onSelectCommentAnchor,
}: {
  detail: RequirementDetailRead;
  onSelectCommentAnchor: (targetAnchor: RequirementCommentAnchor) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2"
      onClick={() =>
        onSelectCommentAnchor(createRequirementDetailCommentAnchor(detail))
      }
    >
      <MessageSquarePlusIcon data-icon="inline-start" />
      コメント
    </Button>
  );
}

export const getRequirementDetailDisplayTitle = (
  detail: RequirementDetailRead,
) => {
  const typeLabel = getRequirementDetailTypeLabel(detail.detail_type);
  const title = getRequirementDetailTitle(detail);
  const prefix = `${typeLabel}: `;

  return title.startsWith(prefix) ? title.slice(prefix.length) : title;
};

const getDetailRowTone = (
  detail: RequirementDetailRead,
): RequirementDetailRowTone => {
  if (detail.detail_type === INPUT_DETAIL_TYPE) {
    return "input";
  }

  if (detail.detail_type === DISPLAY_DETAIL_TYPE) {
    return "display";
  }

  return "default";
};

const ROW_TONE_CLASSES: Record<RequirementDetailRowTone, string> = {
  default: "bg-background",
  input: "bg-muted/30",
  display: "bg-muted/50",
  related: "bg-muted/20",
};

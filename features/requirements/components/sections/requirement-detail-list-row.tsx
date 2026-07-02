"use client";

import { EditIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RequirementDetailRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

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
  onEdit: () => void;
  onDelete: () => void;
};

export function RequirementDetailListRow({
  detail,
  canUpdate,
  tone = "default",
  onEdit,
  onDelete,
}: RequirementDetailListRowProps) {
  const resolvedTone = tone === "default" ? getDetailRowTone(detail) : tone;

  return (
    <div
      className={cn(
        "grid min-w-0 gap-2 border-t px-2 py-2 first:border-t-0 md:grid-cols-[minmax(12rem,1.1fr)_minmax(0,2fr)_auto] md:items-center",
        ROW_TONE_CLASSES[resolvedTone],
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "shrink-0 rounded border px-1.5 py-0.5 text-[11px]",
              BADGE_TONE_CLASSES[resolvedTone],
            )}
          >
            {getRequirementDetailTypeLabel(detail.detail_type)}
          </span>
          <p className="min-w-0 truncate text-sm font-medium">
            {getRequirementDetailDisplayTitle(detail)}
          </p>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDateTime(detail.updated_at)}
        </p>
      </div>
      <RequirementDetailSummary detail={detail} />
      {canUpdate ? (
        <div className="flex shrink-0 flex-wrap gap-1 md:justify-end">
          <RequirementDetailActionButtons onEdit={onEdit} onDelete={onDelete} />
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
    <dl
      className={cn(
        "grid min-w-0 gap-x-4 gap-y-1 text-xs sm:grid-cols-2",
        className,
      )}
    >
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
  input: "bg-emerald-50/45",
  display: "bg-cyan-50/50",
  related: "bg-amber-50/40",
};

const BADGE_TONE_CLASSES: Record<RequirementDetailRowTone, string> = {
  default: "border-border bg-muted/60 text-muted-foreground",
  input: "border-emerald-200 bg-emerald-50 text-emerald-700",
  display: "border-cyan-200 bg-cyan-50 text-cyan-700",
  related: "border-amber-200 bg-amber-50 text-amber-700",
};

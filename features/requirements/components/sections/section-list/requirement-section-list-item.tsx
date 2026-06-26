"use client";

import { ArrowDownIcon, ArrowUpIcon, CheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RequirementSectionRead } from "@/lib/api/generated/model";

import {
  getRequirementDocumentStatusLabel,
  getRequirementSectionTypeLabel,
} from "../../../constants/requirement-options";

type RequirementSectionListItemProps = {
  section: RequirementSectionRead;
  isSelected: boolean;
  canUpdate: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isSortPending: boolean;
  showSelectAction: boolean;
  onSelect?: (sectionId: number) => void;
  onMove: (section: RequirementSectionRead, direction: "up" | "down") => void;
};

export function RequirementSectionListItem({
  section,
  isSelected,
  canUpdate,
  canMoveUp,
  canMoveDown,
  isSortPending,
  showSelectAction,
  onSelect,
  onMove,
}: RequirementSectionListItemProps) {
  return (
    <div
      data-state={isSelected ? "selected" : undefined}
      className="rounded-lg border p-3 data-[state=selected]:border-primary"
    >
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <button
            type="button"
            className="flex min-w-0 flex-col gap-1 text-left"
            onClick={() => onSelect?.(section.id)}
          >
            <span className="min-w-0 break-words font-medium">
              {section.title}
            </span>
            <span className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{getRequirementSectionTypeLabel(section.section_type)}</span>
              <span>{getRequirementDocumentStatusLabel(section.status)}</span>
            </span>
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {showSelectAction ? (
            <Button
              type="button"
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onSelect?.(section.id)}
            >
              {isSelected ? <CheckIcon data-icon="inline-start" /> : null}
              {isSelected ? "選択中" : "選択"}
            </Button>
          ) : null}
          {canUpdate ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={!canMoveUp || isSortPending}
                onClick={() => onMove(section, "up")}
              >
                <ArrowUpIcon />
                <span className="sr-only">上へ</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={!canMoveDown || isSortPending}
                onClick={() => onMove(section, "down")}
              >
                <ArrowDownIcon />
                <span className="sr-only">下へ</span>
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

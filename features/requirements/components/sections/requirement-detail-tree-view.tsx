"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RequirementDetailRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

import {
  createRequirementDetailCommentAnchor,
  getRequirementCommentAnchorKey,
  type RequirementCommentAnchor,
} from "../../lib/requirement-comment-anchor";
import {
  IMPLEMENTATION_UNIT_CHILD_DETAIL_TYPES,
  INPUT_DETAIL_TYPE,
  PARENT_SCREEN_FIELD,
  PARENT_UNIT_FIELD,
  SCREEN_CHILD_DETAIL_TYPES,
  SCREEN_OPERATION_DETAIL_TYPE,
} from "../../lib/requirement-detail-metadata";
import {
  buildRequirementDetailTree,
  type RequirementDetailScreenNode,
  type RequirementDetailUnitNode,
} from "../../lib/requirement-detail-tree";
import type { RequirementDetailFormValues } from "../../types/requirement-detail-form";
import { RequirementDetailItemCard } from "./requirement-detail-item-card";
import {
  CommentTargetButton,
  getRequirementDetailDisplayTitle,
  RequirementDetailActionButtons,
  RequirementDetailListRow,
  RequirementDetailSummary,
} from "./requirement-detail-list-row";

export type RequirementDetailCreateDialogState = {
  title: string;
  description: string;
  allowedDetailTypes: readonly string[];
  initialValues?: RequirementDetailFormValues;
  fixedFieldKeys?: readonly string[];
};

type RequirementDetailTreeViewProps = {
  details: RequirementDetailRead[];
  canUpdate: boolean;
  onEdit: (detail: RequirementDetailRead) => void;
  onDelete: (detail: RequirementDetailRead) => void;
  onCreate: (state: RequirementDetailCreateDialogState) => void;
  onSelectCommentAnchor?: (targetAnchor: RequirementCommentAnchor) => void;
};

export function RequirementDetailTreeView({
  details,
  canUpdate,
  onEdit,
  onDelete,
  onCreate,
  onSelectCommentAnchor,
}: RequirementDetailTreeViewProps) {
  const tree = buildRequirementDetailTree(details);
  const [collapsedUnitIds, setCollapsedUnitIds] = useState<Set<string>>(
    () => new Set(),
  );
  const toggleUnit = (unitId: string) => {
    setCollapsedUnitIds((current) => {
      const next = new Set(current);

      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }

      return next;
    });
  };

  if (!details.length) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        実現内容はありません。まず実現単位を追加し、必要に応じて画面・操作、入力項目、業務ルールなどを紐づけてください。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {tree.units.length ? (
        <div className="flex flex-col gap-3">
          {tree.units.map((unit) => (
            <ImplementationUnitSection
              key={unit.id}
              unit={unit}
              canUpdate={canUpdate}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreate={onCreate}
              onSelectCommentAnchor={onSelectCommentAnchor}
              isCollapsed={collapsedUnitIds.has(unit.id)}
              onToggleCollapse={() => toggleUnit(unit.id)}
            />
          ))}
        </div>
      ) : null}

      {tree.ungrouped.length ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 border-b pb-2">
            <h3 className="text-sm font-medium">未整理の実現内容</h3>
            <span className="text-xs text-muted-foreground">
              {tree.ungrouped.length}件
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {tree.ungrouped.map((detail) => (
              <RequirementDetailListRow
                key={detail.id}
                detail={detail}
                canUpdate={canUpdate}
                onEdit={() => onEdit(detail)}
                onDelete={() => onDelete(detail)}
                onSelectCommentAnchor={onSelectCommentAnchor}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ImplementationUnitSection({
  unit,
  canUpdate,
  onEdit,
  onDelete,
  onCreate,
  onSelectCommentAnchor,
  isCollapsed,
  onToggleCollapse,
}: {
  unit: RequirementDetailUnitNode;
  canUpdate: boolean;
  onEdit: (detail: RequirementDetailRead) => void;
  onDelete: (detail: RequirementDetailRead) => void;
  onCreate: (state: RequirementDetailCreateDialogState) => void;
  onSelectCommentAnchor?: (targetAnchor: RequirementCommentAnchor) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const unitActions = (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2"
        onClick={onToggleCollapse}
      >
        {isCollapsed ? (
          <ChevronRightIcon data-icon="inline-start" />
        ) : (
          <ChevronDownIcon data-icon="inline-start" />
        )}
        {isCollapsed ? "開く" : "閉じる"}
      </Button>
      {canUpdate ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2"
          onClick={() =>
            onCreate({
              title: "実現単位配下に追加",
              description:
                "画面・操作、入力項目、業務ルールなどをこの実現単位に紐づけます。",
              allowedDetailTypes: IMPLEMENTATION_UNIT_CHILD_DETAIL_TYPES,
              initialValues: {
                detailType: SCREEN_OPERATION_DETAIL_TYPE,
                fields: {
                  [PARENT_UNIT_FIELD]: unit.id,
                },
                rawJson: "",
              },
              fixedFieldKeys: [PARENT_UNIT_FIELD],
            })
          }
        >
          <PlusIcon data-icon="inline-start" />
          配下に追加
        </Button>
      ) : null}
    </>
  );

  return (
    <RequirementDetailItemCard
      detail={unit.detail}
      canUpdate={canUpdate}
      variant="unit"
      onSelectCommentAnchor={onSelectCommentAnchor}
      extraActions={unitActions}
      onEdit={() => onEdit(unit.detail)}
      onDelete={() => onDelete(unit.detail)}
    >
      {!isCollapsed ? (
        <div className="flex min-w-0 flex-col gap-3">
          {unit.screens.map((screen) => (
            <ScreenSection
              key={screen.id}
              unitId={unit.id}
              screen={screen}
              canUpdate={canUpdate}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreate={onCreate}
              onSelectCommentAnchor={onSelectCommentAnchor}
            />
          ))}

          {unit.directDetails.length ? (
            <DetailGroup
              title="関連する実現内容"
              details={unit.directDetails}
              canUpdate={canUpdate}
              onEdit={onEdit}
              onDelete={onDelete}
              onSelectCommentAnchor={onSelectCommentAnchor}
            />
          ) : null}
        </div>
      ) : null}
    </RequirementDetailItemCard>
  );
}

function ScreenSection({
  unitId,
  screen,
  canUpdate,
  onEdit,
  onDelete,
  onCreate,
  onSelectCommentAnchor,
}: {
  unitId: string;
  screen: RequirementDetailScreenNode;
  canUpdate: boolean;
  onEdit: (detail: RequirementDetailRead) => void;
  onDelete: (detail: RequirementDetailRead) => void;
  onCreate: (state: RequirementDetailCreateDialogState) => void;
  onSelectCommentAnchor?: (targetAnchor: RequirementCommentAnchor) => void;
}) {
  const screenActions = canUpdate ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 px-2"
      onClick={() =>
        onCreate({
          title: "画面配下に追加",
          description: "この画面に紐づく入力項目または表示項目を追加します。",
          allowedDetailTypes: SCREEN_CHILD_DETAIL_TYPES,
          initialValues: {
            detailType: INPUT_DETAIL_TYPE,
            fields: {
              [PARENT_UNIT_FIELD]: unitId,
              [PARENT_SCREEN_FIELD]: screen.id,
            },
            rawJson: "",
          },
          fixedFieldKeys: [PARENT_UNIT_FIELD, PARENT_SCREEN_FIELD],
        })
      }
    >
      <PlusIcon data-icon="inline-start" />
      画面配下に追加
    </Button>
  ) : null;

  return (
    <section
      className="min-w-0 scroll-mt-24 rounded-md border border-sky-100 bg-sky-50/50 p-3"
      data-requirement-comment-anchor={getRequirementCommentAnchorKey(
        createRequirementDetailCommentAnchor(screen.detail),
      )}
    >
      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 rounded border border-sky-200 bg-white/70 px-1.5 py-0.5 text-[11px] text-sky-700">
              画面・操作
            </span>
            <p className="min-w-0 truncate text-sm font-medium">
              {getRequirementDetailDisplayTitle(screen.detail)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(screen.detail.updated_at)}
          </p>
        </div>
        {canUpdate || screenActions || onSelectCommentAnchor ? (
          <div className="flex shrink-0 flex-wrap gap-1 md:justify-end">
            {onSelectCommentAnchor ? (
              <CommentTargetButton
                detail={screen.detail}
                onSelectCommentAnchor={onSelectCommentAnchor}
              />
            ) : null}
            {screenActions}
            {canUpdate ? (
              <RequirementDetailActionButtons
                onEdit={() => onEdit(screen.detail)}
                onDelete={() => onDelete(screen.detail)}
              />
            ) : null}
          </div>
        ) : null}
      </div>
      <RequirementDetailSummary
        detail={screen.detail}
        className="mt-2 rounded border border-sky-100 bg-white/70 px-2 py-1.5 sm:grid-cols-4"
      />
      {screen.details.length ? (
        <div className="mt-3 border-l-2 border-sky-200 pl-3">
          <DetailGroup
            title="画面配下の項目"
            details={screen.details}
            canUpdate={canUpdate}
            onEdit={onEdit}
            onDelete={onDelete}
            onSelectCommentAnchor={onSelectCommentAnchor}
          />
        </div>
      ) : null}
    </section>
  );
}

function DetailGroup({
  title,
  details,
  canUpdate,
  onEdit,
  onDelete,
  onSelectCommentAnchor,
}: {
  title: string;
  details: RequirementDetailRead[];
  canUpdate: boolean;
  onEdit: (detail: RequirementDetailRead) => void;
  onDelete: (detail: RequirementDetailRead) => void;
  onSelectCommentAnchor?: (targetAnchor: RequirementCommentAnchor) => void;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-1 flex items-center gap-2 px-1">
        <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
        <span className="text-xs text-muted-foreground">
          {details.length}件
        </span>
      </div>
      <div className="overflow-hidden rounded-md border bg-background">
        {details.map((detail) => (
          <RequirementDetailListRow
            key={detail.id}
            detail={detail}
            canUpdate={canUpdate}
            tone={title === "関連する実現内容" ? "related" : "default"}
            onEdit={() => onEdit(detail)}
            onDelete={() => onDelete(detail)}
            onSelectCommentAnchor={onSelectCommentAnchor}
          />
        ))}
      </div>
    </section>
  );
}

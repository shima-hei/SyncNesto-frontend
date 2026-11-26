"use client";

import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { ChevronRightIcon } from "lucide-react";
import { ChangeLogCard } from "@/components/shared/change-log/change-log-card";
import { ChangeLogListCard } from "@/components/shared/change-log/change-log-list-card";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import {
  getChangeLogHeaderFieldLabel,
  getVisibleChangeLogs,
} from "@/lib/change-log/display";
import { getReadRequirementProjectsProjectIdRequirementsRequirementIdGetQueryOptions as requirementQuery } from "@/lib/api/generated/requirements/requirements";
import type { RequirementChangeLogRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";
import { useProjectMemberUsers } from "@/features/projects/hooks/use-project-member-users";

import { useRequirementChangeLogs } from "../../hooks/use-requirement-change-logs";
import { useRequirementSections } from "../../hooks/use-requirement-sections";
import {
  formatRequirementChangeLogAction,
  formatRequirementChangeLogActor,
  getRequirementChangeLogDiffRows,
  formatRequirementChangeLogField,
  getRequirementChangeLogMissingFieldLabels,
  formatRequirementChangeLogTarget,
  formatRequirementHistoryValue,
  getRequirementChangeLogUpdatedFieldLabels,
  getRequirementChangeLogValueDisplayMode,
} from "../../lib/requirement-change-log-format";
import { RequirementSectionSkeleton } from "../shared/requirement-section-skeleton";

type RequirementChangeLogsSectionProps = {
  projectId: number;
  documentId: number;
  title?: string;
  targetType?: string;
  targetId?: number;
  compact?: boolean;
};

export function RequirementChangeLogsSection({
  projectId,
  documentId,
  title = "変更履歴",
  targetType,
  targetId,
  compact = false,
}: RequirementChangeLogsSectionProps) {
  const [page, setPage] = useState(1);
  const { sections } = useRequirementSections(projectId, documentId);
  const { users } = useProjectMemberUsers(projectId, { limit: 100 });
  const labels = {
    members: new Map(users.map((member) => [member.id, member.name])),
    chapters: new Map(sections.map((chapter) => [chapter.id, chapter.title])),
  };
  const { changeLogs, isLoading, error, isFetching, total, refetch } =
    useRequirementChangeLogs(projectId, documentId, {
      targetType,
      targetId,
      page,
    });
  const visibleChangeLogs = getVisibleChangeLogs(changeLogs);
  const itemIds = compact
    ? [
        ...new Set(
          visibleChangeLogs
            .filter((row) => row.target_type === "requirement")
            .map((row) => row.target_id),
        ),
      ]
    : [];
  const requirements = useQueries({
    queries: itemIds.map((id) =>
      requirementQuery(projectId, id, {
        query: { retry: false, staleTime: 30_000 },
      }),
    ),
  });
  const codes = new Map(
    itemIds.map((id, index) => [
      id,
      requirements[index].data?.requirement_code,
    ]),
  );
  if (compact) {
    return (
      <section aria-label={title} className="grid min-w-0 gap-3">
        {error ? (
          <DataLoadError resourceName={title} onRetry={() => void refetch()} />
        ) : isLoading ? (
          <RequirementSectionSkeleton />
        ) : visibleChangeLogs.length ? (
          <ol className="divide-y border-y">
            {visibleChangeLogs.map((row) => (
              <li key={row.id}>
                <details className="group min-w-0">
                  <summary className="flex cursor-pointer list-none items-center gap-3 rounded-sm py-3 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                    <span className="grid min-w-0 flex-1 gap-1">
                      <span className="text-sm font-medium [overflow-wrap:anywhere]">
                        {formatDocumentChangeSummary(
                          row,
                          row.target_type === "requirement"
                            ? codes.get(row.target_id)
                            : row.target_type === "requirement_section"
                              ? labels.chapters.get(row.target_id)
                              : undefined,
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRequirementChangeLogActor(row)} ・{" "}
                        {formatDateTime(row.changed_at)}
                      </span>
                    </span>
                    <ChevronRightIcon
                      className="size-4 shrink-0 text-muted-foreground group-open:rotate-90"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="pb-3">
                    <RequirementChangeLogItem
                      changeLog={row}
                      labels={labels}
                      hideTarget
                    />
                  </div>
                </details>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            変更履歴はありません。
          </p>
        )}
        <DataPagination
          page={page}
          pageSize={20}
          total={total}
          currentCount={changeLogs.length}
          isFetching={isFetching}
          isLoading={isLoading}
          onPageChange={setPage}
        />
      </section>
    );
  }

  return (
    <ChangeLogListCard
      title={title}
      items={visibleChangeLogs}
      isLoading={isLoading}
      loadingFallback={<RequirementSectionSkeleton />}
      renderItem={(changeLog) => (
        <RequirementChangeLogItem
          key={changeLog.id}
          changeLog={changeLog}
          labels={labels}
        />
      )}
    />
  );
}

function formatDocumentChangeSummary(
  row: RequirementChangeLogRead,
  currentLabel?: string,
) {
  const storedLabel = [row.new_value, row.old_value]
    .map((value) =>
      value && typeof value === "object" && "requirement_code" in value
        ? value.requirement_code
        : undefined,
    )
    .find((value): value is string => typeof value === "string");
  const target =
    (typeof storedLabel === "string" ? storedLabel : currentLabel) ??
    formatRequirementChangeLogTarget(row.target_type);
  const updated = getRequirementChangeLogUpdatedFieldLabels(row);
  if (row.action === "updated") {
    const field =
      row.field_name && formatRequirementChangeLogField(row.field_name);
    const changed =
      field && field !== "複数項目"
        ? field
        : updated.length === 1
          ? updated[0]
          : undefined;
    if (changed) return `${target}の${changed}を変更`;
    return updated.length > 1
      ? `${target}を更新（${updated.length}項目）`
      : `${target}を更新`;
  }
  if (row.action === "created") return `${target}を追加`;
  if (row.action === "deleted") return `${target}を削除`;
  return `${target} ・ ${formatRequirementChangeLogAction(row.action)}`;
}

export function RequirementChangeLogItem({
  changeLog,
  timeline = false,
  hideTarget = false,
  labels,
}: {
  changeLog: RequirementChangeLogRead;
  timeline?: boolean;
  hideTarget?: boolean;
  labels: Parameters<typeof formatRequirementHistoryValue>[2];
}) {
  const formatValue = (value: unknown, fieldName?: string | null) =>
    formatRequirementHistoryValue(value, fieldName, labels);
  const updatedFieldLabels =
    getRequirementChangeLogUpdatedFieldLabels(changeLog);
  const diffRows = getRequirementChangeLogDiffRows(changeLog, formatValue);
  const missingFieldLabels =
    getRequirementChangeLogMissingFieldLabels(changeLog);
  const headerFieldLabel = getChangeLogHeaderFieldLabel(
    changeLog.field_name,
    updatedFieldLabels,
    diffRows.length,
    formatRequirementChangeLogField,
  );
  const fieldCount = Math.max(updatedFieldLabels.length, diffRows.length);
  const changedField =
    headerFieldLabel && headerFieldLabel !== "複数項目"
      ? headerFieldLabel
      : (updatedFieldLabels[0] ?? diffRows[0]?.label);
  const actionLabel =
    timeline && changeLog.action === "updated"
      ? fieldCount > 1
        ? `要件を更新（${fieldCount}項目）`
        : changedField
          ? `${changedField}を変更`
          : "要件を更新"
      : timeline && changeLog.action === "created"
        ? "要件を作成"
        : formatRequirementChangeLogAction(changeLog.action);

  return (
    <ChangeLogCard
      compact={timeline}
      changedAt={changeLog.changed_at}
      actionLabel={actionLabel}
      actorLabel={formatRequirementChangeLogActor(changeLog)}
      actorAvatarUrl={changeLog.changed_by_user?.avatar_url}
      changedAtLabel={formatDateTime(changeLog.changed_at)}
      targetLabel={
        timeline || hideTarget
          ? undefined
          : `${formatRequirementChangeLogTarget(changeLog.target_type)} #${changeLog.target_id}`
      }
      fieldName={changeLog.field_name}
      fieldLabel={timeline ? undefined : headerFieldLabel}
      updatedFieldLabels={
        timeline &&
        changeLog.action === "updated" &&
        fieldCount === 1 &&
        updatedFieldLabels.length === 1 &&
        updatedFieldLabels[0] === changedField
          ? undefined
          : updatedFieldLabels
      }
      reason={changeLog.reason}
      oldValue={changeLog.old_value}
      newValue={changeLog.new_value}
      valueDisplayMode={getRequirementChangeLogValueDisplayMode(
        changeLog.action,
      )}
      showRawValues={Boolean(changeLog.field_name)}
      diffRows={diffRows}
      missingFieldLabels={missingFieldLabels}
      formatValue={formatValue}
    />
  );
}

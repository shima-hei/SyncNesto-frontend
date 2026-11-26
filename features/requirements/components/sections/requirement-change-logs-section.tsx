"use client";

import { useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import { ChangeLogCard } from "@/components/shared/change-log/change-log-card";
import { ChangeLogListCard } from "@/components/shared/change-log/change-log-list-card";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import {
  getChangeLogHeaderFieldLabel,
  getVisibleChangeLogs,
} from "@/lib/change-log/display";
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
  timeline?: boolean;
};

export function RequirementChangeLogsSection({
  projectId,
  documentId,
  title = "変更履歴",
  targetType,
  targetId,
  compact = false,
  timeline = false,
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
  if (timeline) {
    return (
      <div className="space-y-3">
        {error ? (
          <DataLoadError resourceName={title} onRetry={() => void refetch()} />
        ) : isLoading ? (
          <p role="status" className="text-sm text-muted-foreground">
            変更履歴を読み込み中…
          </p>
        ) : visibleChangeLogs.length ? (
          <ol className="ml-1">
            {visibleChangeLogs.map((row) => (
              <ChangeLogItem
                key={row.id}
                changeLog={row}
                timeline
                labels={labels}
              />
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
          currentCount={visibleChangeLogs.length}
          isFetching={isFetching}
          isLoading={isLoading}
          onPageChange={setPage}
        />
      </div>
    );
  }
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
                        {formatRequirementChangeLogTarget(row.target_type)} #
                        {row.target_id} ・{" "}
                        {formatRequirementChangeLogAction(row.action)}
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
                    <ChangeLogItem changeLog={row} labels={labels} />
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
        <ChangeLogItem
          key={changeLog.id}
          changeLog={changeLog}
          labels={labels}
        />
      )}
    />
  );
}

function ChangeLogItem({
  changeLog,
  timeline = false,
  labels,
}: {
  changeLog: RequirementChangeLogRead;
  timeline?: boolean;
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
  const actionLabel =
    timeline && changeLog.action === "updated"
      ? fieldCount > 1
        ? `要件を更新（${fieldCount}項目）`
        : headerFieldLabel && headerFieldLabel !== "複数項目"
          ? `${headerFieldLabel}を変更`
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
      changedAtLabel={formatDateTime(changeLog.changed_at)}
      targetLabel={
        timeline
          ? undefined
          : `${formatRequirementChangeLogTarget(changeLog.target_type)} #${changeLog.target_id}`
      }
      fieldName={changeLog.field_name}
      fieldLabel={timeline ? undefined : headerFieldLabel}
      updatedFieldLabels={updatedFieldLabels}
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

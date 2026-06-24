"use client";

import { ChangeLogCard } from "@/components/shared/change-log/change-log-card";
import { ChangeLogListCard } from "@/components/shared/change-log/change-log-list-card";
import {
  getChangeLogHeaderFieldLabel,
  getVisibleChangeLogs,
} from "@/lib/change-log/display";
import type { RequirementChangeLogRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

import { useRequirementChangeLogs } from "../../hooks/use-requirement-change-logs";
import {
  formatRequirementChangeLogAction,
  formatRequirementChangeLogActor,
  getRequirementChangeLogDiffRows,
  formatRequirementChangeLogField,
  getRequirementChangeLogMissingFieldLabels,
  formatRequirementChangeLogTarget,
  formatRequirementChangeLogValue,
  getRequirementChangeLogUpdatedFieldLabels,
} from "../../lib/requirement-change-log-format";
import { RequirementSectionSkeleton } from "../shared/requirement-section-skeleton";

type RequirementChangeLogsSectionProps = {
  projectId: number;
  documentId: number;
  title?: string;
  targetType?: string;
  targetId?: number;
};

export function RequirementChangeLogsSection({
  projectId,
  documentId,
  title = "変更履歴",
  targetType,
  targetId,
}: RequirementChangeLogsSectionProps) {
  const { changeLogs, isLoading } = useRequirementChangeLogs(
    projectId,
    documentId,
    { targetType, targetId }
  );
  const visibleChangeLogs = getVisibleChangeLogs(changeLogs);

  return (
    <ChangeLogListCard
      title={title}
      items={visibleChangeLogs}
      isLoading={isLoading}
      loadingFallback={<RequirementSectionSkeleton />}
      renderItem={(changeLog) => (
        <ChangeLogItem key={changeLog.id} changeLog={changeLog} />
      )}
    />
  );
}

function ChangeLogItem({
  changeLog,
}: {
  changeLog: RequirementChangeLogRead;
}) {
  const updatedFieldLabels = getRequirementChangeLogUpdatedFieldLabels(changeLog);
  const diffRows = getRequirementChangeLogDiffRows(changeLog);
  const missingFieldLabels = getRequirementChangeLogMissingFieldLabels(changeLog);
  const headerFieldLabel = getChangeLogHeaderFieldLabel(
    changeLog.field_name,
    updatedFieldLabels,
    diffRows.length,
    formatRequirementChangeLogField
  );

  return (
    <ChangeLogCard
      actionLabel={formatRequirementChangeLogAction(changeLog.action)}
      actorLabel={formatRequirementChangeLogActor(changeLog)}
      changedAtLabel={formatDateTime(changeLog.changed_at)}
      targetLabel={`${formatRequirementChangeLogTarget(changeLog.target_type)} #${changeLog.target_id}`}
      fieldName={changeLog.field_name}
      fieldLabel={headerFieldLabel}
      updatedFieldLabels={updatedFieldLabels}
      reason={changeLog.reason}
      oldValue={changeLog.old_value}
      newValue={changeLog.new_value}
      showRawValues={Boolean(changeLog.field_name)}
      diffRows={diffRows}
      missingFieldLabels={missingFieldLabels}
      formatValue={formatRequirementChangeLogValue}
    />
  );
}
